import type { ConversationState } from '../types/protocol'

interface StatusIndicatorProps {
  state: ConversationState
  connected: boolean
}

export function StatusIndicator({ state, connected }: StatusIndicatorProps) {
  if (!connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-xs text-zeke-muted">Disconnected</span>
      </div>
    )
  }

  const config: Record<ConversationState, { color: string; text: string }> = {
    idle: { color: 'bg-emerald-400', text: 'Ready' },
    listening: { color: 'bg-zeke-recording', text: 'Listening' },
    transcribing: { color: 'bg-zeke-accent', text: 'Processing' },
    thinking: { color: 'bg-zeke-thinking', text: 'Thinking' },
    speaking: { color: 'bg-zeke-accent', text: 'Speaking' },
  }

  const { color, text } = config[state]

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${color} ${state !== 'idle' ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-zeke-muted">{text}</span>
    </div>
  )
}
