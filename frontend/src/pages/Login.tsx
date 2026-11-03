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
    <div className="min-h-screen bg-zeke-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold text-zeke-text tracking-tight">Zeke</h1>
          <p className="text-xs md:text-sm text-zeke-muted mt-1">Your voice assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zeke-surface rounded-2xl border border-zeke-border p-5 md:p-6 space-y-3 md:space-y-4 shadow-sm">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus
              required
              className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-zeke-canvas border border-zeke-border
                text-zeke-text placeholder-zeke-muted text-sm
                focus:outline-none focus:border-zeke-accent focus:ring-1 focus:ring-zeke-accent transition-colors"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-zeke-canvas border border-zeke-border
                text-zeke-text placeholder-zeke-muted text-sm
                focus:outline-none focus:border-zeke-accent focus:ring-1 focus:ring-zeke-accent transition-colors"
            />
          </div>

          {error && <p className="text-sm text-zeke-recording">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 md:py-3 rounded-xl bg-zeke-accent text-white text-sm font-medium
              hover:bg-zeke-accent/90 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
