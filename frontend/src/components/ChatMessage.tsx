import { ChatMessage as ChatMessageType } from '../types/protocol'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-zeke-accent/10 text-zeke-text rounded-br-md'
            : 'bg-zeke-surface text-zeke-text rounded-bl-md'
          }
        `}
      >
        {message.content}
      </div>
    </div>
  )
}
