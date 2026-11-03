from __future__ import annotations

import io
import logging
import struct
import wave

from backend.config.settings import settings

log = logging.getLogger(__name__)

_voice = None


def _get_voice():
    global _voice
    if _voice is None:
        from piper import PiperVoice

        model_path = str(settings.piper_model_path)
        config_path = model_path + ".json"
        log.info("Loading Piper voice: %s", model_path)
        _voice = PiperVoice.load(model_path, config_path=config_path, use_cuda=False)
        log.info("Piper voice loaded")
    return _voice


def synthesize(text: str) -> bytes:
    voice = _get_voice()

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(settings.tts_sample_rate)
        voice.synthesize(text, wf)

    buf.seek(0)
    with wave.open(buf, "rb") as wf:
        pcm_data = wf.readframes(wf.getnframes())

    return pcm_data


def synthesize_raw(text: str) -> bytes:
    voice = _get_voice()

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(settings.tts_sample_rate)
        voice.synthesize(text, wf)

    buf.seek(0)
    return buf.getvalue()


def is_loaded() -> bool:
    return _voice is not None


def unload() -> None:
    global _voice
    _voice = None
    log.info("Piper voice unloaded")
