import type { ConversationState } from '../types/protocol'

interface AudioVisualizerProps {
  state: ConversationState
}

export function AudioVisualizer({ state }: AudioVisualizerProps) {
  const isActive = state === 'listening' || state === 'speaking'

  if (!isActive) return null

  return (
    <div className="flex items-center gap-[3px] h-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${state === 'listening' ? 'bg-zeke-recording' : 'bg-zeke-accent'}`}
          style={{
            height: '16px',
            animation: `bar-bounce 0.6s ease-in-out ${i * 0.1}s infinite`,
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  )
}
