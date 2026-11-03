from __future__ import annotations

import asyncio
import logging
import uuid

from backend.config.constants import SENTENCE_TERMINATORS, MAX_SPEECH_DURATION_S
from backend.llm.client import llama_client
from backend.llm.prompts import build_system_prompt, build_messages
from backend.memory.conversations import conversation_store
from backend.memory.user_memory import memory_store
from backend.memory.extractor import extract_memories
from backend.voice import stt, tts
from backend.voice.vad import VoiceActivityDetector
from backend.ws.connection import connection_manager
from backend.ws.protocol import (
    ConversationState,
    status_msg,
    user_text_msg,
    assistant_text_msg,
    turn_end_msg,
    error_msg,
)

log = logging.getLogger(__name__)


class ConversationOrchestrator:
    def __init__(self, user_id: str, conversation_id: str) -> None:
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.vad = VoiceActivityDetector()
        self._cancelled = False
        self._processing = False
        self._current_task: asyncio.Task | None = None

    async def handle_audio_chunk(self, pcm_bytes: bytes) -> None:
        if self.vad.buffer_duration_ms > MAX_SPEECH_DURATION_S * 1000:
            self.vad.reset()
            await self._send_json(error_msg("Speech too long, please try again"))
            return

        speech_ended, audio = self.vad.process_chunk(pcm_bytes)

        if speech_ended and audio:
            self._current_task = asyncio.create_task(self._process_turn(audio))

    async def handle_text_input(self, text: str) -> None:
        self._current_task = asyncio.create_task(self._process_text_turn(text))

    async def handle_interrupt(self) -> None:
        self._cancelled = True
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
            try:
                await self._current_task
            except asyncio.CancelledError:
                pass
        self._cancelled = False
        self.vad.reset()
        await self._send_json(status_msg(ConversationState.LISTENING))

    async def _process_turn(self, audio_bytes: bytes) -> None:
        if self._processing:
            return
        self._processing = True
        self._cancelled = False

        try:
            await self._send_json(status_msg(ConversationState.TRANSCRIBING))

            text = await asyncio.to_thread(stt.transcribe, audio_bytes)

            if not text or not text.strip():
                await self._send_json(status_msg(ConversationState.LISTENING))
                return

            await self._send_json(user_text_msg(text))
            await self._generate_response(text)

        except asyncio.CancelledError:
            log.info("Turn cancelled for user %s", self.user_id)
        except Exception:
            log.exception("Error processing turn for user %s", self.user_id)
            await self._send_json(error_msg("Something went wrong, please try again"))
        finally:
            self._processing = False
            if not self._cancelled:
                await self._send_json(status_msg(ConversationState.LISTENING))

    async def _process_text_turn(self, text: str) -> None:
        if self._processing:
            return
        self._processing = True
        self._cancelled = False

        try:
            await self._send_json(user_text_msg(text))
            await self._generate_response(text)
        except asyncio.CancelledError:
            log.info("Text turn cancelled for user %s", self.user_id)
        except Exception:
            log.exception("Error processing text turn for user %s", self.user_id)
            await self._send_json(error_msg("Something went wrong, please try again"))
        finally:
            self._processing = False
            if not self._cancelled:
                await self._send_json(status_msg(ConversationState.LISTENING))

    async def _generate_response(self, user_text: str) -> None:
        await conversation_store.add_message(
            self.conversation_id, "user", user_text
        )

        history = await conversation_store.get_recent_history(self.conversation_id)
        memories = await memory_store.get_for_prompt(self.user_id)

        system_prompt = build_system_prompt(memories)
        messages = build_messages(system_prompt, history, user_text)

        await self._send_json(status_msg(ConversationState.THINKING))

        full_response = ""
        sentence_buffer = ""
        sentence_index = 0
        turn_id = str(uuid.uuid4())

        async for token in llama_client.chat_completion_stream(messages):
            if self._cancelled:
                break

            full_response += token
            sentence_buffer += token

            if any(sentence_buffer.rstrip().endswith(t) for t in SENTENCE_TERMINATORS):
                sentence_text = sentence_buffer.strip()
                if sentence_text:
                    await self._send_json(
                        assistant_text_msg(sentence_text, sentence_index)
                    )

                    await self._send_json(status_msg(ConversationState.SPEAKING))

                    try:
                        audio_data = await asyncio.to_thread(
                            tts.synthesize, sentence_text
                        )
                        if not self._cancelled:
                            await self._send_bytes(audio_data)
                    except Exception:
                        log.exception("TTS failed for sentence %d", sentence_index)

                    sentence_index += 1
                    sentence_buffer = ""

        remaining = sentence_buffer.strip()
        if remaining and not self._cancelled:
            await self._send_json(
                assistant_text_msg(remaining, sentence_index, final=True)
            )
            try:
                audio_data = await asyncio.to_thread(tts.synthesize, remaining)
                if not self._cancelled:
                    await self._send_bytes(audio_data)
            except Exception:
                log.exception("TTS failed for final sentence")

        if self._cancelled:
            spoken_sentences = []
            parts = full_response.split(".")
            for i, part in enumerate(parts):
                if i < sentence_index:
                    spoken_sentences.append(part)
            full_response = ".".join(spoken_sentences)
            if spoken_sentences:
                full_response += "."

        if full_response.strip():
            await conversation_store.add_message(
                self.conversation_id, "assistant", full_response.strip()
            )

        if not self._cancelled:
            await self._send_json(turn_end_msg(turn_id))

        updated_history = await conversation_store.get_recent_history(
            self.conversation_id, limit=6
        )
        asyncio.create_task(
            extract_memories(self.user_id, self.conversation_id, updated_history)
        )

        conv = await conversation_store.get(self.conversation_id)
        if conv and not conv.get("title"):
            title = user_text[:50]
            if len(user_text) > 50:
                title += "..."
            await conversation_store.update_title(self.conversation_id, title)

    async def _send_json(self, data: dict) -> None:
        await connection_manager.send_json(self.user_id, data)

    async def _send_bytes(self, data: bytes) -> None:
        await connection_manager.send_bytes(self.user_id, data)
