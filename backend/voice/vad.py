from __future__ import annotations

import struct
import logging
import math

from backend.config.settings import settings

log = logging.getLogger(__name__)


class VoiceActivityDetector:
    """Energy-based voice activity detector. No external dependencies."""

    FRAME_DURATION_MS = 30
    FRAME_SIZE = settings.stt_sample_rate * FRAME_DURATION_MS // 1000

    # RMS energy threshold for speech detection (int16 scale)
    ENERGY_THRESHOLD = 500

    def __init__(self) -> None:
        self._speech_started = False
        self._silence_frames = 0
        self._speech_buffer = bytearray()
        self._silence_threshold = settings.vad_silence_ms // self.FRAME_DURATION_MS

    def reset(self) -> None:
        self._speech_started = False
        self._silence_frames = 0
        self._speech_buffer = bytearray()

    def _rms_energy(self, frame: bytes) -> float:
        n_samples = len(frame) // 2
        if n_samples == 0:
            return 0.0
        samples = struct.unpack(f"<{n_samples}h", frame)
        sum_sq = sum(s * s for s in samples)
        return math.sqrt(sum_sq / n_samples)

    def process_chunk(self, pcm_bytes: bytes) -> tuple[bool, bytes | None]:
        self._speech_buffer.extend(pcm_bytes)

        frame_bytes = self.FRAME_SIZE * 2
        offset = len(self._speech_buffer) - len(pcm_bytes)
        if offset < 0:
            offset = 0

        while offset + frame_bytes <= len(self._speech_buffer):
            frame = bytes(self._speech_buffer[offset:offset + frame_bytes])
            energy = self._rms_energy(frame)
            is_speech = energy > self.ENERGY_THRESHOLD

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
