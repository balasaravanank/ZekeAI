const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('zeke_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('zeke_token')
    localStorage.removeItem('zeke_user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; expires_in: number; user_id: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ username, password }) }
    ),

  getHealth: () => request<Record<string, unknown>>('/health'),

  getConversations: () => request<Array<Record<string, unknown>>>('/conversations'),

  getConversation: (id: string) =>
    request<{ conversation: Record<string, unknown>; messages: Array<Record<string, unknown>> }>(
      `/conversations/${id}`
    ),

  deleteConversation: (id: string) =>
    request<{ status: string }>(`/conversations/${id}`, { method: 'DELETE' }),

  getMemories: () => request<Array<Record<string, unknown>>>('/memories'),

  updateMemory: (id: string, key: string, value: string) =>
    request<{ status: string }>(`/memories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    }),

  deleteMemory: (id: string) =>
    request<{ status: string }>(`/memories/${id}`, { method: 'DELETE' }),

  getSettings: () => request<Record<string, unknown>>('/settings'),

  updateSettings: (settings: Record<string, unknown>) =>
    request<{ status: string }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
}
