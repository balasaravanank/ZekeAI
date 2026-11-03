from __future__ import annotations

import uuid
from datetime import datetime, timezone

from backend.memory.database import get_db


class ConversationStore:
    async def create(self, user_id: str, title: str | None = None) -> str:
        db = await get_db()
        conv_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (conv_id, user_id, title, now, now),
        )
        await db.commit()
        return conv_id

    async def list_for_user(self, user_id: str, limit: int = 50) -> list[dict]:
        db = await get_db()
        cursor = await db.execute(
            "SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?",
            (user_id, limit),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def get(self, conversation_id: str) -> dict | None:
        db = await get_db()
        cursor = await db.execute(
            "SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE id = ?",
            (conversation_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def update_title(self, conversation_id: str, title: str) -> None:
        db = await get_db()
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            (title, now, conversation_id),
        )
        await db.commit()

    async def touch(self, conversation_id: str) -> None:
        db = await get_db()
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (now, conversation_id),
        )
        await db.commit()

    async def delete(self, conversation_id: str) -> None:
        db = await get_db()
        await db.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
        await db.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
        await db.commit()

    async def add_message(
        self, conversation_id: str, role: str, content: str
    ) -> str:
        db = await get_db()
        msg_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.execute(
            "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (msg_id, conversation_id, role, content, now),
        )
        await db.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (now, conversation_id),
        )
        await db.commit()
        return msg_id

    async def get_messages(
        self, conversation_id: str, limit: int = 100
    ) -> list[dict]:
        db = await get_db()
        cursor = await db.execute(
            "SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?",
            (conversation_id, limit),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

    async def get_recent_history(
        self, conversation_id: str, limit: int = 20
    ) -> list[dict[str, str]]:
        db = await get_db()
        cursor = await db.execute(
            "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?",
            (conversation_id, limit),
        )
        rows = await cursor.fetchall()
        return [{"role": r["role"], "content": r["content"]} for r in reversed(rows)]

    async def update_last_assistant_message(
        self, conversation_id: str, content: str
    ) -> None:
        db = await get_db()
        cursor = await db.execute(
            "SELECT id FROM messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1",
            (conversation_id,),
        )
        row = await cursor.fetchone()
        if row:
            await db.execute(
                "UPDATE messages SET content = ? WHERE id = ?",
                (content, row["id"]),
            )
            await db.commit()


conversation_store = ConversationStore()
