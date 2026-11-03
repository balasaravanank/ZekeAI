import { useState, useRef, useEffect, useCallback } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useAudioPlayback } from '../hooks/useAudioPlayback'
import { StatusIndicator } from '../components/StatusIndicator'
import { ChatMessage } from '../components/ChatMessage'
import { ConversationSidebar } from '../components/ConversationSidebar'
import { Settings } from './Settings'
import type { ChatMessage as ChatMessageType, ConversationState } from '../types/protocol'

interface ChatProps {
  token: string
  onLogout: () => void
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Chat({ token, onLogout }: ChatProps) {
  const [state, setState] = useState<ConversationState>('idle')
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingAssistant, setPendingAssistant] = useState('')
  const [recordingTime, setRecordingTime] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const playback = useAudioPlayback()

  const ws = useWebSocket({
    token,
    onStatusChange: setState,
    onUserText: (text) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user', content: text, timestamp: Date.now() },
      ])
      setPendingAssistant('')
    },
    onAssistantText: (text, _sentenceIndex, isFinal) => {
      setPendingAssistant((prev) => {
        const updated = prev ? `${prev} ${text}` : text
        if (isFinal) {
          setMessages((msgs) => [
            ...msgs,
            { id: crypto.randomUUID(), role: 'assistant', content: updated, timestamp: Date.now() },
          ])
          return ''
        }
        return updated
      })
    },
    onTurnEnd: () => {
      setPendingAssistant((prev) => {
        if (prev) {
          setMessages((msgs) => [
            ...msgs,
            { id: crypto.randomUUID(), role: 'assistant', content: prev, timestamp: Date.now() },
          ])
        }
        return ''
      })
    },
    onAudioChunk: (data) => {
      playback.enqueue(data)
    },
    onError: (message) => {
      console.error('Zeke error:', message)
    },
    onConversationCreated: (id) => {
      setConversationId(id)
      setMessages([])
      setPendingAssistant('')
    },
  })

  const capture = useAudioCapture({
    onAudioChunk: (data) => {
      ws.sendBinary(data)
    },
    onStart: () => {
      ws.sendAudioStart()
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000)
    },
    onStop: () => {
      ws.sendAudioEnd()
      clearInterval(timerRef.current)
      setRecordingTime(0)
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingAssistant])

  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  const handleMicToggle = useCallback(() => {
    if (capture.capturing) {
      capture.stop()
    } else if (state === 'speaking') {
      playback.stop()
      ws.sendInterrupt()
    } else if (state === 'idle') {
      capture.start()
    }
  }, [capture, state, playback, ws])

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = textInput.trim()
    if (!text) return
    setTextInput('')
    ws.sendTextInput(text)
  }

  const isRecording = capture.capturing
  const isBusy = state === 'transcribing' || state === 'thinking'

  return (
    <div className="h-[100dvh] bg-zeke-canvas flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 bg-zeke-surface border-b border-zeke-border shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zeke-muted hover:text-zeke-text transition-colors p-1 -ml-1"
            aria-label="Conversations"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-zeke-text">Zeke</span>
          <StatusIndicator state={state} connected={ws.connected} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-zeke-muted hover:text-zeke-text transition-colors p-1"
            aria-label="Settings"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            className="text-[11px] text-zeke-muted hover:text-zeke-text transition-colors"
          >
            Out
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        <div className="max-w-2xl mx-auto space-y-2">
          {messages.length === 0 && !pendingAssistant && state === 'idle' && (
            <div className="text-center py-10">
              <p className="text-zeke-text font-medium text-sm mb-1">Hey, I'm Zeke</p>
              <p className="text-xs text-zeke-muted">Tap the mic and start talking, or type below.</p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {pendingAssistant && (
            <ChatMessage
              message={{
                id: 'pending',
                role: 'assistant',
                content: pendingAssistant,
                timestamp: Date.now(),
              }}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 bg-zeke-surface border-t border-zeke-border px-3 py-2.5 safe-bottom">
        <div className="max-w-2xl mx-auto">
          {/* Recording state */}
          {isRecording && (
            <div className="flex items-center justify-between mb-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zeke-recording animate-pulse" />
                <span className="text-sm text-zeke-recording font-medium">Recording</span>
                <span className="text-sm text-zeke-muted tabular-nums">{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={handleMicToggle}
                className="px-3 py-1.5 rounded-lg bg-zeke-recording text-white text-xs font-medium"
              >
                Stop
              </button>
            </div>
          )}

          {/* Processing/thinking indicator */}
          {isBusy && (
            <div className="flex items-center gap-2 mb-0">
              <span
                className="w-2.5 h-2.5 rounded-full border-2 border-transparent border-t-zeke-accent"
                style={{ animation: 'spin-border 0.8s linear infinite' }}
              />
              <span className="text-sm text-zeke-muted">
                {state === 'transcribing' ? 'Processing your speech...' : 'Thinking...'}
              </span>
            </div>
          )}

          {/* Speaking indicator */}
          {state === 'speaking' && (
            <div className="flex items-center justify-between mb-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-[2px]">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-[2px] rounded-full bg-zeke-accent"
                      style={{
                        height: '12px',
                        animation: `bar-bounce 0.6s ease-in-out ${i * 0.12}s infinite`,
                        transformOrigin: 'center',
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm text-zeke-accent font-medium">Zeke is speaking</span>
              </div>
              <button
                onClick={handleMicToggle}
                className="text-xs text-zeke-muted hover:text-zeke-text"
              >
                Interrupt
              </button>
            </div>
          )}

          {/* Normal input: text + mic */}
          {!isRecording && !isBusy && state !== 'speaking' && (
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-zeke-canvas border border-zeke-border
                  text-sm text-zeke-text placeholder-zeke-muted
                  focus:outline-none focus:border-zeke-accent transition-colors"
              />
              {textInput.trim() ? (
                <button
                  type="submit"
                  className="shrink-0 w-10 h-10 rounded-full bg-zeke-accent text-white flex items-center justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMicToggle}
                  className="shrink-0 w-10 h-10 rounded-full bg-zeke-accent text-white flex items-center justify-center
                    hover:bg-zeke-accent/90 active:scale-95 transition-all"
                  aria-label="Start recording"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      <ConversationSidebar
        currentId={conversationId}
        onSelect={(id) => { setConversationId(id); setSidebarOpen(false) }}
        onNew={() => { ws.sendNewConversation(); setSidebarOpen(false) }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
