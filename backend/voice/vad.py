from __future__ import annotations

import struct
import logging

from backend.config.settings import settings

log = logging.getLogger(__name__)


class VoiceActivityDetector:
    FRAME_DURATION_MS = 30
    FRAME_SIZE = settings.stt_sample_rate * FRAME_DURATION_MS // 1000  # samples per frame

    def __init__(self) -> None:
        import webrtcvad

        self._vad = webrtcvad.Vad(settings.vad_aggressiveness)
        self._speech_started = False
        self._silence_frames = 0
        self._speech_buffer = bytearray()
        self._silence_threshold = settings.vad_silence_ms // self.FRAME_DURATION_MS

    def reset(self) -> None:
        self._speech_started = False
        self._silence_frames = 0
        self._speech_buffer = bytearray()

    def process_chunk(self, pcm_bytes: bytes) -> tuple[bool, bytes | None]:
        """Process a chunk of PCM audio.

        Returns (speech_ended, audio_bytes).
        When speech_ended is True, audio_bytes contains the complete speech segment.
        """
        self._speech_buffer.extend(pcm_bytes)

        frame_bytes = self.FRAME_SIZE * 2  # 2 bytes per sample (s16le)
        offset = len(self._speech_buffer) - len(pcm_bytes)
        if offset < 0:
            offset = 0

        while offset + frame_bytes <= len(self._speech_buffer):
            frame = bytes(self._speech_buffer[offset:offset + frame_bytes])
            is_speech = self._vad.is_speech(frame, settings.stt_sample_rate)

            if is_speech:
                self._speech_started = True
                self._silence_frames = 0
            elif self._speech_started:
                self._silence_frames += 1

            offset += frame_bytes

        if self._speech_started and self._silence_frames >= self._silence_threshold:
            audio = bytes(self._speech_buffer)
            self.reset()
            return True, audio

        return False, None

    @property
    def has_speech(self) -> bool:
        return self._speech_started

    @property
    def buffer_duration_ms(self) -> int:
        return len(self._speech_buffer) * 1000 // (settings.stt_sample_rate * 2)
