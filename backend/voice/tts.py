from __future__ import annotations

import logging
import subprocess

from backend.config.settings import settings

log = logging.getLogger(__name__)


def synthesize(text: str) -> bytes:
    result = subprocess.run(
        [
            str(settings.piper_binary_path),
            "--model", str(settings.piper_model_path),
            "--config", str(settings.piper_model_path) + ".json",
            "--output_raw",
        ],
        input=text.encode("utf-8"),
        capture_output=True,
        text=False,
        timeout=30,
    )

    if result.returncode != 0:
        log.error("Piper TTS failed: %s", result.stderr.decode(errors="replace"))
        return b""

    return result.stdout


def is_loaded() -> bool:
    return settings.piper_binary_path.exists()


def unload() -> None:
    pass
