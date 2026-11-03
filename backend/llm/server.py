from __future__ import annotations

import asyncio
import logging
import subprocess
import signal
from pathlib import Path

import httpx

from backend.config.settings import settings

log = logging.getLogger(__name__)


class LlamaServer:
    def __init__(self) -> None:
        self._process: subprocess.Popen | None = None
        self._healthy = False

    @property
    def binary_path(self) -> Path:
        return settings.base_dir / "llama-server"

    def _build_cmd(self) -> list[str]:
        return [
            str(self.binary_path),
            "-m", str(settings.llm_model_path),
            "-c", str(settings.llm_context_size),
            "--parallel", str(settings.llm_parallel_slots),
            "-t", str(settings.llm_threads),
            "--host", settings.llm_host,
            "--port", str(settings.llm_port),
            "--log-disable",
        ]

    async def start(self) -> None:
        if self._process and self._process.poll() is None:
            log.info("llama-server already running (pid %d)", self._process.pid)
            return

        cmd = self._build_cmd()
        log.info("Starting llama-server: %s", " ".join(cmd))

        self._process = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
        )

        for _ in range(60):
            if await self.health_check():
                self._healthy = True
                log.info("llama-server ready (pid %d)", self._process.pid)
                return
            await asyncio.sleep(1)

        raise RuntimeError("llama-server did not become healthy within 60 seconds")

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.llm_base_url}/health", timeout=2.0
                )
                return resp.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException):
            return False

    async def stop(self) -> None:
        if self._process and self._process.poll() is None:
            log.info("Stopping llama-server (pid %d)", self._process.pid)
            self._process.send_signal(signal.SIGTERM)
            try:
                self._process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait()
            log.info("llama-server stopped")
        self._process = None
        self._healthy = False

    async def restart(self) -> None:
        await self.stop()
        await self.start()

    @property
    def is_healthy(self) -> bool:
        return self._healthy and self._process is not None and self._process.poll() is None


llama_server = LlamaServer()
