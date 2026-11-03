import { useRef, useCallback, useState } from 'react'

interface UseAudioCaptureOptions {
  onAudioChunk: (data: ArrayBuffer) => void
  onStart?: () => void
  onStop?: () => void
}

export function useAudioCapture(options: UseAudioCaptureOptions) {
  const [capturing, setCapturing] = useState(false)
  const contextRef = useRef<AudioContext | null>(null)
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      })
      streamRef.current = stream

      const ctx = new AudioContext({ sampleRate: 48000 })
      contextRef.current = ctx

      // Create worklet from inline blob
      const workletCode = `
        class PCMCaptureProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.buffer = [];
          }
          process(inputs) {
            const input = inputs[0]?.[0];
            if (!input || input.length === 0) return true;
            this.buffer.push(new Float32Array(input));
            const totalSamples = this.buffer.reduce((sum, buf) => sum + buf.length, 0);
            if (totalSamples >= sampleRate * 0.25) {
              const merged = new Float32Array(totalSamples);
              let offset = 0;
              for (const buf of this.buffer) {
                merged.set(buf, offset);
                offset += buf.length;
              }
              this.buffer = [];
              const ratio = sampleRate / 16000;
              const downsampled = new Float32Array(Math.floor(merged.length / ratio));
              for (let i = 0; i < downsampled.length; i++) {
                downsampled[i] = merged[Math.floor(i * ratio)];
              }
              const pcm = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) {
                const s = Math.max(-1, Math.min(1, downsampled[i]));
                pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              this.port.postMessage({ type: 'audio', buffer: pcm.buffer }, [pcm.buffer]);
            }
            return true;
          }
        }
        registerProcessor('pcm-capture-processor', PCMCaptureProcessor);
      `
      const blob = new Blob([workletCode], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)
      await ctx.audioWorklet.addModule(url)
      URL.revokeObjectURL(url)

      const workletNode = new AudioWorkletNode(ctx, 'pcm-capture-processor')
      workletNode.port.onmessage = (e) => {
        if (e.data.type === 'audio') {
          optionsRef.current.onAudioChunk(e.data.buffer)
        }
      }
      workletRef.current = workletNode

      const source = ctx.createMediaStreamSource(stream)
      source.connect(workletNode)
      workletNode.connect(ctx.destination)

      setCapturing(true)
      optionsRef.current.onStart?.()
    } catch (err) {
      console.error('Audio capture failed:', err)
    }
  }, [])

  const stop = useCallback(() => {
    workletRef.current?.disconnect()
    workletRef.current = null

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    contextRef.current?.close()
    contextRef.current = null

    setCapturing(false)
    optionsRef.current.onStop?.()
  }, [])

  return { capturing, start, stop }
}
