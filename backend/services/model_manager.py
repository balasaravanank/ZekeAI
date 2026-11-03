from __future__ import annotations

import logging

from backend.config.settings import settings
from backend.voice import stt, tts
from backend.llm.server import llama_server

log = logging.getLogger(__name__)


async def load_all_models() -> None:
    log.info("Starting model loading...")

    if not settings.whisper_binary_path.exists():
        raise RuntimeError(f"whisper-cli not found at {settings.whisper_binary_path}")
    log.info("whisper-cli found at %s", settings.whisper_binary_path)

    if not settings.piper_binary_path.exists():
        raise RuntimeError(f"piper not found at {settings.piper_binary_path}")
    log.info("piper found at %s", settings.piper_binary_path)

    await llama_server.start()

    log.info("All models loaded and ready")


async def unload_all_models() -> None:
    log.info("Unloading models...")
    await llama_server.stop()
    log.info("All models unloaded")


def get_status() -> dict:
    return {
        "llm": llama_server.is_healthy,
        "stt": stt.is_loaded(),
        "tts": tts.is_loaded(),
    }
