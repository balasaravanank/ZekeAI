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
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative w-72 bg-zeke-bg border-r border-zeke-border h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zeke-border">
          <span className="text-sm font-medium text-zeke-text">Conversations</span>
          <button
            onClick={onNew}
            className="text-xs text-zeke-accent hover:text-zeke-text transition-colors"
          >
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`
                w-full text-left px-4 py-3 text-sm border-b border-zeke-border/50
                transition-colors hover:bg-zeke-surface
                ${conv.id === currentId ? 'bg-zeke-surface text-zeke-text' : 'text-zeke-muted'}
              `}
            >
              <div className="truncate">
                {conv.title || 'New conversation'}
              </div>
              <div className="text-xs text-zeke-muted-2 mt-0.5">
                {new Date(conv.updated_at).toLocaleDateString()}
              </div>
            </button>
          ))}

          {conversations.length === 0 && (
            <div className="p-4 text-sm text-zeke-muted-2 text-center">
              No conversations yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
