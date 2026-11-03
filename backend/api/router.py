from fastapi import APIRouter

from backend.api import auth, conversations, health, memories, settings

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(health.router)
api_router.include_router(conversations.router)
api_router.include_router(memories.router)
api_router.include_router(settings.router)
