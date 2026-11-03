import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Conversation } from '../types/protocol'

interface ConversationSidebarProps {
  currentId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  open: boolean
  onClose: () => void
}

export function ConversationSidebar({
  currentId,
  onSelect,
  onNew,
  open,
  onClose,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])

  useEffect(() => {
    if (open) {
      api.getConversations().then((data) => {
        setConversations(data as unknown as Conversation[])
      })
    }
  }, [open, currentId])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-[280px] bg-zeke-surface border-r border-zeke-border h-full flex flex-col shadow-lg">
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-zeke-border">
          <span className="text-sm font-medium text-zeke-text">Conversations</span>
          <button
            onClick={onNew}
            className="text-xs text-zeke-accent hover:text-zeke-accent/80 font-medium transition-colors"
          >
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`
                w-full text-left px-3 md:px-4 py-2.5 md:py-3 text-sm border-b border-zeke-border/50
                transition-colors hover:bg-zeke-canvas
                ${conv.id === currentId ? 'bg-zeke-accent-light' : ''}
              `}
            >
              <div className="truncate text-zeke-text text-sm">
                {conv.title || 'New conversation'}
              </div>
              <div className="text-[11px] text-zeke-muted mt-0.5">
                {new Date(conv.updated_at).toLocaleDateString()}
              </div>
            </button>
          ))}

          {conversations.length === 0 && (
            <div className="p-4 text-sm text-zeke-muted text-center">
              No conversations yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
