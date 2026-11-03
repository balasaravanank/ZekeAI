from __future__ import annotations

import logging
import struct
import tempfile
import wave
from pathlib import Path

from backend.config.settings import settings

log = logging.getLogger(__name__)

_model = None


def _get_model():
    global _model
    if _model is None:
        from pywhispercpp.model import Model

        model_path = str(settings.whisper_model_path)
        log.info("Loading whisper model: %s", model_path)
        _model = Model(model_path, n_threads=2, print_progress=False, print_realtime=False)
        log.info("Whisper model loaded")
    return _model


def transcribe(pcm_bytes: bytes, sample_rate: int = 16000) -> str:
    model = _get_model()

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp_path = f.name
        with wave.open(f, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_bytes)

    try:
        segments = model.transcribe(tmp_path)
        text = " ".join(seg.text.strip() for seg in segments if seg.text.strip())
        return text
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def is_loaded() -> bool:
    return _model is not None


def unload() -> None:
    global _model
    _model = None
    log.info("Whisper model unloaded")
