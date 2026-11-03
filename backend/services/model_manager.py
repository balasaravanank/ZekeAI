from __future__ import annotations

import logging

from backend.voice import stt, tts
from backend.llm.server import llama_server

log = logging.getLogger(__name__)


async def load_all_models() -> None:
    log.info("Starting model loading...")

    await llama_server.start()

    import asyncio
    await asyncio.to_thread(stt.transcribe, b"\x00" * 3200)
    log.info("STT model warmed up")

    await asyncio.to_thread(tts.synthesize, "Ready.")
    log.info("TTS model warmed up")

    log.info("All models loaded and ready")


async def unload_all_models() -> None:
    log.info("Unloading models...")
    await llama_server.stop()
    stt.unload()
    tts.unload()
    log.info("All models unloaded")


def get_status() -> dict:
    return {
        "llm": llama_server.is_healthy,
        "stt": stt.is_loaded(),
        "tts": tts.is_loaded(),
    }
