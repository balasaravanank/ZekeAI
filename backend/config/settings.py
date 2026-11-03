from __future__ import annotations

import json
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # --- Auth ---
    jwt_secret: str = "change-me-in-production"
    jwt_expiry_hours: int = 24
    # JSON dict: {"alice": "$2b$12$...", "bob": "$2b$12$..."}
    users_json: str = '{}'

    # --- Paths ---
    base_dir: Path = Path.home() / "zeke-ai"
    models_dir: Path = Path.home() / "zeke-ai" / "models"
    data_dir: Path = Path.home() / "zeke-ai" / "data"

    # --- STT ---
    whisper_model: str = "ggml-base.en.bin"

    # --- LLM ---
    llm_model: str = "qwen2.5-1.5b-instruct-q4_k_m.gguf"
    llm_context_size: int = 2048
    llm_max_tokens: int = 256
    llm_parallel_slots: int = 2
    llm_threads: int = 3
    llm_host: str = "127.0.0.1"
    llm_port: int = 8081
    llm_temperature: float = 0.7

    # --- TTS ---
    piper_voice: str = "en_US-lessac-medium"

    # --- Audio ---
    stt_sample_rate: int = 16000
    tts_sample_rate: int = 22050
    vad_aggressiveness: int = 2
    vad_silence_ms: int = 300

    # --- Backup ---
    github_token: str = ""
    backup_repo: str = ""
    backup_interval_minutes: int = 15

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"

    @property
    def users(self) -> dict[str, str]:
        return json.loads(self.users_json)

    @property
    def db_path(self) -> Path:
        return self.data_dir / "zeke.db"

    @property
    def whisper_model_path(self) -> Path:
        return self.models_dir / self.whisper_model

    @property
    def llm_model_path(self) -> Path:
        return self.models_dir / self.llm_model

    @property
    def piper_model_path(self) -> Path:
        return self.models_dir / f"{self.piper_voice}.onnx"

    @property
    def llm_base_url(self) -> str:
        return f"http://{self.llm_host}:{self.llm_port}"

    model_config = {"env_prefix": "ZEKE_"}


settings = Settings()
