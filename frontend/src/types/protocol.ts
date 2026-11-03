export type ConversationState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'

export interface ServerMessage {
  type: string
  [key: string]: unknown
}

export interface UserTextMessage extends ServerMessage {
  type: 'user_text'
  text: string
}

export interface AssistantTextMessage extends ServerMessage {
  type: 'assistant_text'
  text: string
  sentence_index: number
  final?: boolean
}

export interface TurnEndMessage extends ServerMessage {
  type: 'turn_end'
  turn_id: string
}

export interface StatusMessage extends ServerMessage {
  type: 'status'
  state: ConversationState
}

export interface ErrorMessage extends ServerMessage {
  type: 'error'
  message: string
}

export interface ConversationCreatedMessage extends ServerMessage {
  type: 'conversation_created'
  conversation_id: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface Memory {
  id: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

export interface UserSettings {
  tts_enabled: boolean
  tts_voice: string
  llm_temperature: number
  llm_max_tokens: number
}
