from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from backend.api.auth import verify_token
from backend.config.constants import WS_CLOSE_AUTH_FAILED
from backend.memory.conversations import conversation_store
from backend.services.orchestrator import ConversationOrchestrator
from backend.ws.connection import connection_manager
from backend.ws.protocol import (
    ClientMessageType,
    ConversationState,
    status_msg,
    error_msg,
    conversation_created_msg,
)

log = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/conversation")
async def conversation_websocket(
    websocket: WebSocket,
    token: str = Query(default=""),
) -> None:
    user_id = verify_token(token)
    if not user_id:
        await websocket.close(code=WS_CLOSE_AUTH_FAILED, reason="Authentication failed")
        return

    await websocket.accept()
    await connection_manager.connect(user_id, websocket)
    log.info("WebSocket connected: user=%s", user_id)

    conversations = await conversation_store.list_for_user(user_id, limit=1)
    if conversations:
        conversation_id = conversations[0]["id"]
    else:
        conversation_id = await conversation_store.create(user_id)

    orchestrator = ConversationOrchestrator(user_id, conversation_id)

    await websocket.send_text(
        json.dumps(conversation_created_msg(conversation_id))
    )
    await websocket.send_text(
        json.dumps(status_msg(ConversationState.IDLE))
    )

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            if "bytes" in message and message["bytes"]:
                await orchestrator.handle_audio_chunk(message["bytes"])
                continue

            if "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type", "")

                if msg_type == ClientMessageType.AUDIO_START:
                    orchestrator.vad.reset()
                    await websocket.send_text(
                        json.dumps(status_msg(ConversationState.LISTENING))
                    )

                elif msg_type == ClientMessageType.AUDIO_END:
                    if orchestrator.vad.has_speech:
                        audio = bytes(orchestrator.vad._speech_buffer)
                        orchestrator.vad.reset()
                        if audio:
                            orchestrator._current_task = asyncio.create_task(
                                orchestrator._process_turn(audio)
                            )

                elif msg_type == ClientMessageType.TEXT_INPUT:
                    text = data.get("text", "").strip()
                    if text:
                        await orchestrator.handle_text_input(text)

                elif msg_type == ClientMessageType.INTERRUPT:
                    await orchestrator.handle_interrupt()

                elif msg_type == ClientMessageType.NEW_CONVERSATION:
                    conversation_id = await conversation_store.create(user_id)
                    orchestrator = ConversationOrchestrator(user_id, conversation_id)
                    await websocket.send_text(
                        json.dumps(conversation_created_msg(conversation_id))
                    )

                elif msg_type == ClientMessageType.CONFIG:
                    pass

    except WebSocketDisconnect:
        log.info("WebSocket disconnected: user=%s", user_id)
    except Exception:
        log.exception("WebSocket error: user=%s", user_id)
    finally:
        connection_manager.disconnect(user_id)
