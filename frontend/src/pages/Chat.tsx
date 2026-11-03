import { useState, useRef, useEffect, useCallback } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { useAudioPlayback } from '../hooks/useAudioPlayback'
import { VoiceButton } from '../components/VoiceButton'
import { StatusIndicator } from '../components/StatusIndicator'
import { ChatMessage } from '../components/ChatMessage'
import { ConversationSidebar } from '../components/ConversationSidebar'
import { Settings } from './Settings'
import type { ChatMessage as ChatMessageType, ConversationState } from '../types/protocol'

interface ChatProps {
  token: string
  onLogout: () => void
}

export function Chat({ token, onLogout }: ChatProps) {
  const [state, setState] = useState<ConversationState>('idle')
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [textInput, setTextInput] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pendingAssistant, setPendingAssistant] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    },
    onStop: () => {
      ws.sendAudioEnd()
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingAssistant])

  const handleMicToggle = useCallback(() => {
    if (capture.capturing) {
      capture.stop()
    } else {
      if (state === 'speaking') {
        playback.stop()
        ws.sendInterrupt()
      }
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

  return (
    <div className="h-screen bg-zeke-canvas flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-zeke-surface border-b border-zeke-border shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zeke-muted hover:text-zeke-text transition-colors p-1"
            aria-label="Open conversations"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-zeke-text">Zeke</h1>
          <StatusIndicator state={state} connected={ws.connected} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-zeke-muted hover:text-zeke-text transition-colors p-1"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            className="text-xs text-zeke-muted hover:text-zeke-text transition-colors font-medium"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.length === 0 && !pendingAssistant && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">👋</div>
              <p className="text-zeke-text font-medium mb-1">Hey, I'm Zeke</p>
              <p className="text-sm text-zeke-muted">
                Tap the mic and start talking, or type a message below.
              </p>
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

      {/* Voice + Input area */}
      <div className="shrink-0 bg-zeke-surface border-t border-zeke-border px-4 py-5">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          {/* Mic button */}
          <VoiceButton
            state={state}
            capturing={capture.capturing}
            onClick={handleMicToggle}
          />

          {/* Text input */}
          <form onSubmit={handleTextSubmit} className="w-full">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type a message..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-zeke-canvas border border-zeke-border
                  text-sm text-zeke-text placeholder-zeke-muted
                  focus:outline-none focus:border-zeke-accent focus:ring-1 focus:ring-zeke-accent transition-colors"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-zeke-accent text-white text-sm font-medium
                  hover:bg-zeke-accent/90 transition-colors
                  disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sidebar */}
      <ConversationSidebar
        currentId={conversationId}
        onSelect={(id) => {
          setConversationId(id)
          setSidebarOpen(false)
        }}
        onNew={() => {
          ws.sendNewConversation()
          setSidebarOpen(false)
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Settings */}
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
