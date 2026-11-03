from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.api.auth import get_current_user
from backend.memory.database import get_db

router = APIRouter(prefix="/api/settings", tags=["settings"])


class UserSettings(BaseModel):
    tts_enabled: bool = True
    tts_voice: str = "en_US-lessac-medium"
    llm_temperature: float = 0.7
    llm_max_tokens: int = 256


@router.get("")
async def get_settings(user_id: str = Depends(get_current_user)) -> UserSettings:
    db = await get_db()
    cursor = await db.execute(
        "SELECT tts_enabled, tts_voice, llm_temperature, llm_max_tokens FROM user_settings WHERE user_id = ?",
        (user_id,),
    )
    row = await cursor.fetchone()
    if row:
        return UserSettings(**dict(row))
    return UserSettings()


@router.put("")
async def update_settings(
    body: UserSettings,
    user_id: str = Depends(get_current_user),
) -> dict:
    db = await get_db()
    await db.execute(
        """INSERT INTO user_settings (user_id, tts_enabled, tts_voice, llm_temperature, llm_max_tokens)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET
               tts_enabled = excluded.tts_enabled,
               tts_voice = excluded.tts_voice,
               llm_temperature = excluded.llm_temperature,
               llm_max_tokens = excluded.llm_max_tokens,
               updated_at = CURRENT_TIMESTAMP""",
        (user_id, body.tts_enabled, body.tts_voice, body.llm_temperature, body.llm_max_tokens),
    )
    await db.commit()
    return {"status": "updated"}
