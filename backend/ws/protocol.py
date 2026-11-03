from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any


class ConversationState(str, Enum):
    IDLE = "idle"
    LISTENING = "listening"
    TRANSCRIBING = "transcribing"
    THINKING = "thinking"
    SPEAKING = "speaking"


class ClientMessageType(str, Enum):
    AUDIO_START = "audio_start"
    AUDIO_END = "audio_end"
    TEXT_INPUT = "text_input"
    INTERRUPT = "interrupt"
    CONFIG = "config"
    NEW_CONVERSATION = "new_conversation"


class ServerMessageType(str, Enum):
    USER_TEXT = "user_text"
    ASSISTANT_TEXT = "assistant_text"
    TURN_END = "turn_end"
    STATUS = "status"
    ERROR = "error"
    CONVERSATION_CREATED = "conversation_created"


def server_msg(msg_type: ServerMessageType, **kwargs: Any) -> dict:
    return {"type": msg_type.value, **kwargs}


def status_msg(state: ConversationState) -> dict:
    return server_msg(ServerMessageType.STATUS, state=state.value)


def user_text_msg(text: str) -> dict:
    return server_msg(ServerMessageType.USER_TEXT, text=text)


def assistant_text_msg(text: str, sentence_index: int, final: bool = False) -> dict:
    return server_msg(
        ServerMessageType.ASSISTANT_TEXT,
        text=text,
        sentence_index=sentence_index,
        final=final,
    )


def turn_end_msg(turn_id: str) -> dict:
    return server_msg(ServerMessageType.TURN_END, turn_id=turn_id)


def error_msg(message: str) -> dict:
    return server_msg(ServerMessageType.ERROR, message=message)


def conversation_created_msg(conversation_id: str) -> dict:
    return server_msg(ServerMessageType.CONVERSATION_CREATED, conversation_id=conversation_id)
