from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket

from backend.config.constants import WS_CLOSE_DUPLICATE

log = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        existing = self._connections.get(user_id)
        if existing:
            log.info("Closing duplicate connection for user %s", user_id)
            try:
                await existing.close(code=WS_CLOSE_DUPLICATE, reason="New connection opened")
            except Exception:
                pass

        self._connections[user_id] = websocket

    def disconnect(self, user_id: str) -> None:
        self._connections.pop(user_id, None)

    async def send_json(self, user_id: str, data: dict[str, Any]) -> None:
        ws = self._connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                log.exception("Failed to send JSON to %s", user_id)

    async def send_bytes(self, user_id: str, data: bytes) -> None:
        ws = self._connections.get(user_id)
        if ws:
            try:
                await ws.send_bytes(data)
            except Exception:
                log.exception("Failed to send bytes to %s", user_id)

    def is_connected(self, user_id: str) -> bool:
        return user_id in self._connections

    @property
    def active_count(self) -> int:
        return len(self._connections)


connection_manager = ConnectionManager()
