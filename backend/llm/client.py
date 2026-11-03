from __future__ import annotations

import json
import logging
from typing import AsyncIterator

import httpx

from backend.config.settings import settings

log = logging.getLogger(__name__)


class LlamaClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            base_url=settings.llm_base_url,
            timeout=httpx.Timeout(connect=5.0, read=120.0, write=5.0, pool=5.0),
        )

    async def chat_completion_stream(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        payload = {
            "messages": messages,
            "stream": True,
            "temperature": temperature or settings.llm_temperature,
            "max_tokens": max_tokens or settings.llm_max_tokens,
        }

        async with self._client.stream(
            "POST",
            "/v1/chat/completions",
            json=payload,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data.strip() == "[DONE]":
                    return
                try:
                    chunk = json.loads(data)
                    delta = chunk["choices"][0].get("delta", {})
                    content = delta.get("content", "")
                    if content:
                        yield content
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        payload = {
            "messages": messages,
            "stream": False,
            "temperature": temperature or settings.llm_temperature,
            "max_tokens": max_tokens or settings.llm_max_tokens,
        }
        resp = await self._client.post("/v1/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]

    async def close(self) -> None:
        await self._client.aclose()


llama_client = LlamaClient()
