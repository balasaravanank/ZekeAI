from __future__ import annotations

import json
import logging

from backend.llm.client import llama_client
from backend.llm.prompts import MEMORY_EXTRACTION_PROMPT
from backend.memory.user_memory import memory_store

log = logging.getLogger(__name__)


async def extract_memories(
    user_id: str,
    conversation_id: str,
    recent_messages: list[dict[str, str]],
) -> None:
    if not recent_messages:
        return

    conversation_text = "\n".join(
        f"{m['role'].title()}: {m['content']}" for m in recent_messages[-6:]
    )

    prompt = MEMORY_EXTRACTION_PROMPT.format(conversation=conversation_text)

    try:
        response = await llama_client.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=200,
        )

        response = response.strip()
        if response.startswith("```"):
            response = response.split("\n", 1)[-1].rsplit("```", 1)[0]

        facts = json.loads(response)
        if not isinstance(facts, list):
            return

        for fact in facts:
            if isinstance(fact, dict) and "key" in fact and "value" in fact:
                key = str(fact["key"]).strip().lower().replace(" ", "_")
                value = str(fact["value"]).strip()
                if key and value:
                    await memory_store.upsert(
                        user_id=user_id,
                        key=key,
                        value=value,
                        source_conversation_id=conversation_id,
                    )
                    log.info("Extracted memory for %s: %s = %s", user_id, key, value)

    except Exception:
        log.exception("Memory extraction failed")
