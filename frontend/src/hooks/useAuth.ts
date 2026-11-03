import { useState, useCallback } from 'react'
import { api } from '../lib/api'

interface AuthState {
  token: string | null
  userId: string | null
}

function loadState(): AuthState {
  return {
    token: localStorage.getItem('zeke_token'),
    userId: localStorage.getItem('zeke_user'),
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(loadState)

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password)
    localStorage.setItem('zeke_token', res.token)
    localStorage.setItem('zeke_user', res.user_id)
    setState({ token: res.token, userId: res.user_id })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('zeke_token')
    localStorage.removeItem('zeke_user')
    setState({ token: null, userId: null })
  }, [])

  return {
    isAuthenticated: !!state.token,
    token: state.token,
    userId: state.userId,
    login,
    logout,
  }
}
