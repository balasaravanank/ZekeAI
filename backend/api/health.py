from __future__ import annotations

import os
import platform

from fastapi import APIRouter

from backend.llm.server import llama_server
from backend.voice import stt, tts
from backend.ws.connection import connection_manager

router = APIRouter(prefix="/api", tags=["health"])


def _get_memory_usage_mb() -> float | None:
    try:
        import resource
        usage = resource.getrusage(resource.RUSAGE_SELF)
        return usage.ru_maxrss / 1024  # Linux reports in KB
    except Exception:
        return None


@router.get("/health")
async def health() -> dict:
    llm_healthy = await llama_server.health_check()

    return {
        "status": "ok" if llm_healthy else "degraded",
        "models": {
            "llm": {"loaded": llm_healthy},
            "stt": {"loaded": stt.is_loaded()},
            "tts": {"loaded": tts.is_loaded()},
        },
        "connections": connection_manager.active_count,
        "system": {
            "platform": platform.platform(),
            "cpu_count": os.cpu_count(),
            "memory_usage_mb": _get_memory_usage_mb(),
        },
    }
