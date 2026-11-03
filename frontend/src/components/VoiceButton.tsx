import type { ConversationState } from '../types/protocol'

interface VoiceButtonProps {
  state: ConversationState
  capturing: boolean
  onClick: () => void
}

export function VoiceButton({ state, capturing, onClick }: VoiceButtonProps) {
  const isRecording = capturing || state === 'listening'
  const isProcessing = state === 'transcribing'
  const isThinking = state === 'thinking'
  const isSpeaking = state === 'speaking'
  const isBusy = isProcessing || isThinking || isSpeaking

  let label = 'Tap to speak'
  let bgClass = 'bg-white border-2 border-zeke-accent'
  let iconColor = 'text-zeke-accent'

  if (isRecording) {
    label = 'Tap to stop'
    bgClass = 'bg-zeke-recording border-2 border-zeke-recording'
    iconColor = 'text-white'
  } else if (isProcessing) {
    label = 'Processing...'
    bgClass = 'bg-white border-2 border-zeke-accent'
    iconColor = 'text-zeke-accent'
  } else if (isThinking) {
    label = 'Thinking...'
    bgClass = 'bg-white border-2 border-zeke-thinking'
    iconColor = 'text-zeke-thinking'
  } else if (isSpeaking) {
    label = 'Tap to interrupt'
    bgClass = 'bg-white border-2 border-zeke-accent'
    iconColor = 'text-zeke-accent'
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {isRecording && (
          <>
            <span
              className="absolute inset-0 rounded-full bg-zeke-recording"
              style={{ animation: 'ripple 1.5s ease-out infinite' }}
            />
            <span
              className="absolute inset-0 rounded-full bg-zeke-recording"
              style={{ animation: 'ripple 1.5s ease-out 0.5s infinite' }}
            />
          </>
        )}

        {isThinking && (
          <span
            className="absolute inset-0 rounded-full"
            style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
          />
        )}

        {isProcessing && (
          <span
            className="absolute -inset-1 rounded-full border-2 border-transparent border-t-zeke-accent"
            style={{ animation: 'spin-border 0.8s linear infinite' }}
          />
        )}

        <button
          onClick={isBusy && !isSpeaking ? undefined : onClick}
          disabled={isProcessing || isThinking}
          className={`
            relative w-16 h-16 md:w-[72px] md:h-[72px] rounded-full
            ${bgClass}
            flex items-center justify-center
            transition-all duration-200
            shadow-sm hover:shadow-md active:scale-95
            focus:outline-none focus-visible:ring-2 focus-visible:ring-zeke-accent focus-visible:ring-offset-2
            disabled:cursor-wait disabled:active:scale-100
          `}
          aria-label={label}
        >
          {isSpeaking ? (
            <div className="flex items-center gap-[3px]">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-zeke-accent"
                  style={{
                    height: '18px',
                    animation: `bar-bounce 0.6s ease-in-out ${i * 0.1}s infinite`,
                    transformOrigin: 'center',
                  }}
                />
              ))}
            </div>
          ) : (
            <svg
              className={`w-6 h-6 md:w-7 md:h-7 ${iconColor} transition-colors`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </button>
      </div>

      <span className="text-[11px] md:text-xs text-zeke-muted font-medium">
        {label}
      </span>
    </div>
  )
}
