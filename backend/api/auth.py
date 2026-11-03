from __future__ import annotations

import logging
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.hash import bcrypt
from pydantic import BaseModel

from backend.config.constants import LOGIN_RATE_LIMIT
from backend.config.settings import settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_security = HTTPBearer(auto_error=False)

_login_attempts: dict[str, list[float]] = defaultdict(list)


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    expires_in: int
    user_id: str


def _create_token(user_id: str) -> tuple[str, int]:
    expires = int(settings.jwt_expiry_hours * 3600)
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(seconds=expires),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    return token, expires


def verify_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_security),
) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user_id


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    window = [t for t in _login_attempts[ip] if now - t < 60]
    _login_attempts[ip] = window
    if len(window) >= LOGIN_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many login attempts")


@router.post("/login", response_model=LoginResponse)
async def login(request: Request, body: LoginRequest) -> LoginResponse:
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)
    _login_attempts[client_ip].append(time.time())

    users = settings.users
    if not users:
        raise HTTPException(status_code=503, detail="No users configured")

    stored_hash = users.get(body.username)
    if not stored_hash or not bcrypt.verify(body.password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token, expires = _create_token(body.username)
    return LoginResponse(token=token, expires_in=expires, user_id=body.username)
