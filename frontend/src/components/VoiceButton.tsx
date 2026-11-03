import { ConversationState } from '../types/protocol'

interface VoiceButtonProps {
  state: ConversationState
  capturing: boolean
  onPress: () => void
  onRelease: () => void
}

const stateStyles: Record<ConversationState, { ring: string; pulse: boolean; label: string }> = {
  idle: { ring: 'border-zeke-muted-2', pulse: false, label: 'Hold to speak' },
  listening: { ring: 'border-zeke-accent', pulse: true, label: 'Listening...' },
  transcribing: { ring: 'border-zeke-accent', pulse: true, label: 'Processing...' },
  thinking: { ring: 'border-zeke-amber', pulse: true, label: 'Thinking...' },
  speaking: { ring: 'border-zeke-accent', pulse: false, label: 'Speaking...' },
}

export function VoiceButton({ state, capturing, onPress, onRelease }: VoiceButtonProps) {
  const { ring, pulse, label } = stateStyles[state]

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onMouseDown={onPress}
        onMouseUp={onRelease}
        onMouseLeave={onRelease}
        onTouchStart={(e) => { e.preventDefault(); onPress() }}
        onTouchEnd={(e) => { e.preventDefault(); onRelease() }}
        className={`
          relative w-20 h-20 rounded-full
          bg-zeke-surface border-2 ${ring}
          flex items-center justify-center
          transition-colors duration-300
          hover:bg-zeke-border active:scale-95
          focus:outline-none focus-visible:ring-2 focus-visible:ring-zeke-accent focus-visible:ring-offset-2 focus-visible:ring-offset-zeke-bg
          ${pulse ? 'animate-pulse' : ''}
        `}
        aria-label={label}
      >
        <svg
          className={`w-8 h-8 ${capturing ? 'text-zeke-accent' : 'text-zeke-muted'} transition-colors`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>

        {pulse && (
          <span className="absolute inset-0 rounded-full border-2 border-zeke-accent animate-ping opacity-20" />
        )}
      </button>

      <span className="text-xs text-zeke-muted font-light tracking-wide">
        {label}
      </span>
    </div>
  )
}
