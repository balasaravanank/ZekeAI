from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.api.auth import get_current_user
from backend.memory.user_memory import memory_store

router = APIRouter(prefix="/api/memories", tags=["memories"])


class MemoryUpdate(BaseModel):
    key: str
    value: str


@router.get("")
async def list_memories(user_id: str = Depends(get_current_user)) -> list[dict]:
    return await memory_store.get_all(user_id)


@router.put("/{memory_id}")
async def update_memory(
    memory_id: str,
    body: MemoryUpdate,
    user_id: str = Depends(get_current_user),
) -> dict:
    await memory_store.update(memory_id, body.key, body.value)
    return {"status": "updated"}


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    user_id: str = Depends(get_current_user),
) -> dict:
    await memory_store.delete(memory_id)
    return {"status": "deleted"}
