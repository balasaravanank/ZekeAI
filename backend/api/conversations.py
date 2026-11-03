from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.api.auth import get_current_user
from backend.memory.conversations import conversation_store

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("")
async def list_conversations(user_id: str = Depends(get_current_user)) -> list[dict]:
    return await conversation_store.list_for_user(user_id)


@router.get("/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
) -> dict:
    conv = await conversation_store.get(conversation_id)
    if not conv or conv["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = await conversation_store.get_messages(conversation_id)
    return {"conversation": conv, "messages": messages}


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user),
) -> dict:
    conv = await conversation_store.get(conversation_id)
    if not conv or conv["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await conversation_store.delete(conversation_id)
    return {"status": "deleted"}
