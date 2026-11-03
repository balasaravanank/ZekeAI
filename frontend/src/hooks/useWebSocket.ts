import { useRef, useEffect, useCallback, useState } from 'react'
import type { ServerMessage, ConversationState, ChatMessage } from '../types/protocol'

interface UseWebSocketOptions {
  token: string | null
  onStatusChange?: (state: ConversationState) => void
  onUserText?: (text: string) => void
  onAssistantText?: (text: string, sentenceIndex: number, isFinal: boolean) => void
  onTurnEnd?: (turnId: string) => void
  onAudioChunk?: (data: ArrayBuffer) => void
  onError?: (message: string) => void
  onConversationCreated?: (conversationId: string) => void
}

export function useWebSocket(options: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const optionsRef = useRef(options)
  optionsRef.current = options

  const connect = useCallback(() => {
    if (!optionsRef.current.token) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/conversation?token=${optionsRef.current.token}`
    const ws = new WebSocket(url)

    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      setConnected(true)
    }

    ws.onclose = (e) => {
      setConnected(false)
      wsRef.current = null
      if (e.code !== 4001 && e.code !== 4002) {
        reconnectTimer.current = setTimeout(connect, 3000)
      }
    }

    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        optionsRef.current.onAudioChunk?.(e.data)
        return
      }

      try {
        const msg: ServerMessage = JSON.parse(e.data)
        switch (msg.type) {
          case 'status':
            optionsRef.current.onStatusChange?.(msg.state as ConversationState)
            break
          case 'user_text':
            optionsRef.current.onUserText?.(msg.text as string)
            break
          case 'assistant_text':
            optionsRef.current.onAssistantText?.(
              msg.text as string,
              msg.sentence_index as number,
              !!msg.final
            )
            break
          case 'turn_end':
            optionsRef.current.onTurnEnd?.(msg.turn_id as string)
            break
          case 'error':
            optionsRef.current.onError?.(msg.message as string)
            break
          case 'conversation_created':
            optionsRef.current.onConversationCreated?.(msg.conversation_id as string)
            break
        }
      } catch {
        // ignore malformed messages
      }
    }

    wsRef.current = ws
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendJson = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const sendBinary = useCallback((data: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data)
    }
  }, [])

  const sendTextInput = useCallback((text: string) => {
    sendJson({ type: 'text_input', text })
  }, [sendJson])

  const sendInterrupt = useCallback(() => {
    sendJson({ type: 'interrupt' })
  }, [sendJson])

  const sendAudioStart = useCallback(() => {
    sendJson({ type: 'audio_start' })
  }, [sendJson])

  const sendAudioEnd = useCallback(() => {
    sendJson({ type: 'audio_end' })
  }, [sendJson])

  const sendNewConversation = useCallback(() => {
    sendJson({ type: 'new_conversation' })
  }, [sendJson])

  return {
    connected,
    sendBinary,
    sendJson,
    sendTextInput,
    sendInterrupt,
    sendAudioStart,
    sendAudioEnd,
    sendNewConversation,
  }
}
