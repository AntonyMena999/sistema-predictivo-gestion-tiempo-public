export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  status?: "sent" | "error"
}

export interface ChatSession {
  sessionId: string
  titulo: string
  ultima_actividad: string
}
