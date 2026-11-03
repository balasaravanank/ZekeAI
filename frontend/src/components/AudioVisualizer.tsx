import { ConversationState } from '../types/protocol'

interface AudioVisualizerProps {
  state: ConversationState
}

export function AudioVisualizer({ state }: AudioVisualizerProps) {
  const isActive = state === 'listening' || state === 'speaking'

  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`
            w-[3px] rounded-full transition-all duration-150
            ${isActive ? 'bg-zeke-accent' : 'bg-zeke-muted-2'}
          `}
          style={{
            height: isActive ? `${12 + Math.sin(Date.now() / 200 + i * 0.8) * 10}px` : '4px',
            animation: isActive ? `visualizer-bar 0.6s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes visualizer-bar {
          from { height: 6px; }
          to { height: 24px; }
        }
      `}</style>
    </div>
  )
}
