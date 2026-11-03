// This file is loaded as a separate module by AudioWorklet
// It runs in the audio rendering thread, not the main thread

const PROCESSOR_NAME = 'pcm-capture-processor'

class PCMCaptureProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array[] = []
  private targetSampleRate = 16000

  constructor() {
    super()
    this.port.onmessage = (e) => {
      if (e.data.type === 'stop') {
        this.buffer = []
      }
    }
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0]
    if (!input || input.length === 0) return true

    this.buffer.push(new Float32Array(input))

    // Send ~250ms of audio at a time (4096 samples at 48kHz ≈ 85ms, accumulate ~3 frames)
    const totalSamples = this.buffer.reduce((sum, buf) => sum + buf.length, 0)
    if (totalSamples >= sampleRate * 0.25) {
      const merged = new Float32Array(totalSamples)
      let offset = 0
      for (const buf of this.buffer) {
        merged.set(buf, offset)
        offset += buf.length
      }
      this.buffer = []

      // Downsample to 16kHz
      const ratio = sampleRate / this.targetSampleRate
      const downsampled = new Float32Array(Math.floor(merged.length / ratio))
      for (let i = 0; i < downsampled.length; i++) {
        downsampled[i] = merged[Math.floor(i * ratio)]
      }

      // Convert float32 [-1, 1] to int16
      const pcm = new Int16Array(downsampled.length)
      for (let i = 0; i < downsampled.length; i++) {
        const s = Math.max(-1, Math.min(1, downsampled[i]))
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }

      this.port.postMessage({ type: 'audio', buffer: pcm.buffer }, [pcm.buffer])
    }

    return true
  }
}

registerProcessor(PROCESSOR_NAME, PCMCaptureProcessor)
