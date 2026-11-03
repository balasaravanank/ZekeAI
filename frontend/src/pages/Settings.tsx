import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Memory, UserSettings } from '../types/protocol'

interface SettingsProps {
  open: boolean
  onClose: () => void
}

export function Settings({ open, onClose }: SettingsProps) {
  const [tab, setTab] = useState<'settings' | 'memories'>('settings')
  const [settings, setSettings] = useState<UserSettings>({
    tts_enabled: true,
    tts_voice: 'en_US-lessac-medium',
    llm_temperature: 0.7,
    llm_max_tokens: 256,
  })
  const [memories, setMemories] = useState<Memory[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      api.getSettings().then((data) => setSettings(data as unknown as UserSettings))
      api.getMemories().then((data) => setMemories(data as unknown as Memory[]))
    }
  }, [open])

  const handleSaveSettings = async () => {
    setSaving(true)
    await api.updateSettings(settings as unknown as Record<string, unknown>)
    setSaving(false)
  }

  const handleDeleteMemory = async (id: string) => {
    await api.deleteMemory(id)
    setMemories((prev) => prev.filter((m) => m.id !== id))
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-zeke-bg border border-zeke-border rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zeke-border">
          <div className="flex gap-4">
            <button
              onClick={() => setTab('settings')}
              className={`text-sm ${tab === 'settings' ? 'text-zeke-text' : 'text-zeke-muted'}`}
            >
              Settings
            </button>
            <button
              onClick={() => setTab('memories')}
              className={`text-sm ${tab === 'memories' ? 'text-zeke-text' : 'text-zeke-muted'}`}
            >
              Memories
            </button>
          </div>
          <button onClick={onClose} className="text-zeke-muted hover:text-zeke-text text-lg">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'settings' && (
            <div className="space-y-5">
              <label className="flex items-center justify-between">
                <span className="text-sm text-zeke-text">Voice responses</span>
                <input
                  type="checkbox"
                  checked={settings.tts_enabled}
                  onChange={(e) => setSettings({ ...settings, tts_enabled: e.target.checked })}
                  className="accent-zeke-accent"
                />
              </label>

              <div>
                <label className="text-sm text-zeke-text block mb-1.5">Temperature</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={settings.llm_temperature}
                  onChange={(e) => setSettings({ ...settings, llm_temperature: parseFloat(e.target.value) })}
                  className="w-full accent-zeke-accent"
                />
                <span className="text-xs text-zeke-muted">{settings.llm_temperature}</span>
              </div>

              <div>
                <label className="text-sm text-zeke-text block mb-1.5">Max response length</label>
                <input
                  type="range"
                  min="64"
                  max="512"
                  step="64"
                  value={settings.llm_max_tokens}
                  onChange={(e) => setSettings({ ...settings, llm_max_tokens: parseInt(e.target.value) })}
                  className="w-full accent-zeke-accent"
                />
                <span className="text-xs text-zeke-muted">{settings.llm_max_tokens} tokens</span>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full py-2 rounded-lg bg-zeke-accent/10 text-zeke-accent text-sm
                  hover:bg-zeke-accent/20 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          )}

          {tab === 'memories' && (
            <div className="space-y-2">
              {memories.length === 0 && (
                <p className="text-sm text-zeke-muted-2 text-center py-8">
                  No memories yet. Zeke learns about you as you talk.
                </p>
              )}
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className="flex items-start justify-between gap-2 p-3 rounded-lg bg-zeke-surface"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-zeke-muted">{mem.key}</div>
                    <div className="text-sm text-zeke-text truncate">{mem.value}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="text-zeke-muted-2 hover:text-red-400 text-xs shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
