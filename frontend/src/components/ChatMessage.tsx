import type { ChatMessage as ChatMessageType } from '../types/protocol'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[85%] md:max-w-[80%] px-3 md:px-4 py-2 md:py-2.5 rounded-2xl text-sm md:text-[15px] leading-relaxed
          ${isUser
            ? 'bg-zeke-accent text-white rounded-br-md'
            : 'bg-zeke-surface text-zeke-text border border-zeke-border rounded-bl-md'
          }
        `}
      >
        {message.content}
      </div>
    </div>
  )
}
