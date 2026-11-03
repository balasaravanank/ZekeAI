from __future__ import annotations

from datetime import datetime, timezone

from backend.config.constants import MAX_CONVERSATION_HISTORY


SYSTEM_TEMPLATE = """You are Zeke, a friendly and intelligent voice assistant. You speak naturally and conversationally — you are not a search engine or a chatbot, you are a companion.

Rules:
- Keep responses concise. The user is speaking to you out loud, so long paragraphs are exhausting to listen to.
- One to three sentences is ideal for most answers. Go longer only when the user explicitly asks for detail.
- Be direct. Don't hedge with "I think" or "In my opinion" unless genuinely uncertain.
- Never use markdown, bullet points, numbered lists, or code blocks — the user is listening, not reading.
- Use natural spoken language. Say "about 30 percent" not "~30%". Say "first, second, third" not "1. 2. 3."
- If you don't know something, say so briefly.

Current date and time: {current_time}

{memory_section}"""


def build_system_prompt(memories: list[dict[str, str]]) -> str:
    now = datetime.now(timezone.utc).strftime("%A, %B %d, %Y at %H:%M UTC")

    if memories:
        lines = [f"- {m['key']}: {m['value']}" for m in memories]
        memory_section = "What you remember about this user:\n" + "\n".join(lines)
    else:
        memory_section = ""

    return SYSTEM_TEMPLATE.format(current_time=now, memory_section=memory_section).strip()


def build_messages(
    system_prompt: str,
    history: list[dict[str, str]],
    user_text: str,
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

    recent = history[-MAX_CONVERSATION_HISTORY:]
    messages.extend(recent)

    messages.append({"role": "user", "content": user_text})
    return messages


MEMORY_EXTRACTION_PROMPT = """Given this conversation between a user and an assistant, extract any NEW personal facts about the user worth remembering for future conversations.

Return a JSON array of objects with "key" and "value" fields. Use short descriptive keys like "name", "job", "favorite_food", "location", etc.

If there are no new facts to extract, return an empty array: []

Only extract facts the user explicitly stated. Do not infer or assume.

Conversation:
{conversation}

Respond ONLY with the JSON array, nothing else."""
