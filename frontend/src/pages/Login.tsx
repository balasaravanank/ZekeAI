import { useState } from 'react'

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zeke-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-zeke-text tracking-tight">Zeke</h1>
          <p className="text-sm text-zeke-muted mt-1">Voice assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus
              required
              className="w-full px-4 py-3 rounded-lg bg-zeke-surface border border-zeke-border
                text-zeke-text placeholder-zeke-muted-2 text-sm
                focus:outline-none focus:border-zeke-accent/50 transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full px-4 py-3 rounded-lg bg-zeke-surface border border-zeke-border
                text-zeke-text placeholder-zeke-muted-2 text-sm
                focus:outline-none focus:border-zeke-accent/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-zeke-accent/10 text-zeke-accent text-sm font-medium
              hover:bg-zeke-accent/20 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
