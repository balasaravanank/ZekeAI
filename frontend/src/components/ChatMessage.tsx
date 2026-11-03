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
          max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-zeke-accent text-white rounded-br-sm'
            : 'bg-white text-zeke-text border border-zeke-border rounded-bl-sm shadow-sm'
          }
        `}
      >
        {message.content}
      </div>
    </div>
  )
}
