from __future__ import annotations

import logging
import subprocess
import tempfile
import wave
from pathlib import Path

from backend.config.settings import settings

log = logging.getLogger(__name__)


def transcribe(pcm_bytes: bytes, sample_rate: int = 16000) -> str:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp_wav = f.name
        with wave.open(f, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_bytes)

    try:
        result = subprocess.run(
            [
                str(settings.whisper_binary_path),
                "-m", str(settings.whisper_model_path),
                "-f", tmp_wav,
                "--no-prints",
                "--no-timestamps",
                "-otxt",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        txt_path = tmp_wav + ".txt"
        if Path(txt_path).exists():
            text = Path(txt_path).read_text().strip()
            Path(txt_path).unlink(missing_ok=True)
            return text

        if result.stdout.strip():
            return result.stdout.strip()

        if result.returncode != 0:
            log.error("whisper-cli failed: %s", result.stderr)

        return ""
    finally:
        Path(tmp_wav).unlink(missing_ok=True)


def is_loaded() -> bool:
    return settings.whisper_binary_path.exists()


def unload() -> None:
    pass
