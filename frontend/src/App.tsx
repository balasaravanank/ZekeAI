import { useAuth } from './hooks/useAuth'
import { Login } from './pages/Login'
import { Chat } from './pages/Chat'

export function App() {
  const auth = useAuth()

  if (!auth.isAuthenticated || !auth.token) {
    return <Login onLogin={auth.login} />
  }

  return <Chat token={auth.token} onLogout={auth.logout} />
}
