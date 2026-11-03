from __future__ import annotations

import uuid
from datetime import datetime, timezone

from backend.config.constants import MAX_MEMORIES_PER_USER
from backend.memory.database import get_db


class MemoryStore:
    async def get_all(self, user_id: str) -> list[dict]:
        db = await get_db()
        cursor = await db.execute(
            "SELECT id, key, value, created_at, updated_at FROM memories WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def get_for_prompt(self, user_id: str) -> list[dict[str, str]]:
        db = await get_db()
        cursor = await db.execute(
            "SELECT key, value FROM memories WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?",
            (user_id, MAX_MEMORIES_PER_USER),
        )
        rows = await cursor.fetchall()
        return [{"key": r["key"], "value": r["value"]} for r in rows]

    async def upsert(
        self,
        user_id: str,
        key: str,
        value: str,
        source_conversation_id: str | None = None,
    ) -> str:
        db = await get_db()
        now = datetime.now(timezone.utc).isoformat()

        cursor = await db.execute(
            "SELECT id FROM memories WHERE user_id = ? AND key = ?",
            (user_id, key),
        )
        existing = await cursor.fetchone()

        if existing:
            await db.execute(
                "UPDATE memories SET value = ?, updated_at = ? WHERE id = ?",
                (value, now, existing["id"]),
            )
            await db.commit()
            return existing["id"]

        count_cursor = await db.execute(
            "SELECT COUNT(*) as cnt FROM memories WHERE user_id = ?",
            (user_id,),
        )
        count_row = await count_cursor.fetchone()
        if count_row["cnt"] >= MAX_MEMORIES_PER_USER:
            await db.execute(
                "DELETE FROM memories WHERE id = (SELECT id FROM memories WHERE user_id = ? ORDER BY updated_at ASC LIMIT 1)",
                (user_id,),
            )

        mem_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO memories (id, user_id, key, value, source_conversation_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (mem_id, user_id, key, value, source_conversation_id, now, now),
        )
        await db.commit()
        return mem_id

    async def delete(self, memory_id: str) -> None:
        db = await get_db()
        await db.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        await db.commit()

    async def update(self, memory_id: str, key: str, value: str) -> None:
        db = await get_db()
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "UPDATE memories SET key = ?, value = ?, updated_at = ? WHERE id = ?",
            (key, value, now, memory_id),
        )
        await db.commit()


memory_store = MemoryStore()
