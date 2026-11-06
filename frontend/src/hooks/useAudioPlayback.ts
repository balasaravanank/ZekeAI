import { useRef, useCallback } from 'react'

interface UseAudioPlaybackOptions {
  sampleRate?: number
  onPlaybackEnd?: () => void
}

export function useAudioPlayback(options: UseAudioPlaybackOptions = {}) {
  const { sampleRate = 22050 } = options
  const contextRef = useRef<AudioContext | null>(null)
  const queueRef = useRef<AudioBuffer[]>([])
  const playingRef = useRef(false)
  const nextTimeRef = useRef(0)
  const onPlaybackEndRef = useRef(options.onPlaybackEnd)
  onPlaybackEndRef.current = options.onPlaybackEnd

  const getContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === 'closed') {
      contextRef.current = new AudioContext({ sampleRate })
    }
    if (contextRef.current.state === 'suspended') {
      contextRef.current.resume()
    }
    return contextRef.current
  }, [sampleRate])

  const enqueue = useCallback(
    (pcmData: ArrayBuffer) => {
      const ctx = getContext()
      const samples = new Int16Array(pcmData)
      const float32 = new Float32Array(samples.length)
      for (let i = 0; i < samples.length; i++) {
        float32[i] = samples[i] / (samples[i] < 0 ? 0x8000 : 0x7fff)
      }

      const buffer = ctx.createBuffer(1, float32.length, sampleRate)
      buffer.getChannelData(0).set(float32)

      const source = ctx.createBufferSource()
      source.buffer = buffer

      const startTime = Math.max(ctx.currentTime, nextTimeRef.current)
      source.connect(ctx.destination)
      source.start(startTime)
      nextTimeRef.current = startTime + buffer.duration

      source.onended = () => {
        const c = contextRef.current
        if (c && c.currentTime >= nextTimeRef.current - 0.05) {
          onPlaybackEndRef.current?.()
        }
      }
    },
    [getContext, sampleRate]
  )

  const stop = useCallback(() => {
    if (contextRef.current && contextRef.current.state !== 'closed') {
      contextRef.current.close()
      contextRef.current = null
    }
    queueRef.current = []
    playingRef.current = false
    nextTimeRef.current = 0
  }, [])

  const isPlaying = useCallback(() => {
    if (!contextRef.current) return false
    return contextRef.current.currentTime < nextTimeRef.current
  }, [])

  return { enqueue, stop, isPlaying }
}
