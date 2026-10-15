import { useState, useEffect, useCallback } from "react"
import api from "../services/api"
import type { ChatSession } from "../types/chat"

const historySubscribers = new Set<() => void>()

export function notifyChatHistoryChanged() {
  historySubscribers.forEach((callback) => callback())
}

export default function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await api.get<{ data: ChatSession[] }>("/api/chats")
      setSessions(response.data.data ?? [])
    } catch (err) {
      console.error("Error cargando historial de chats:", err)
      setError("No se pudo cargar el historial de chats")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    historySubscribers.add(fetchSessions)
    return () => {
      historySubscribers.delete(fetchSessions)
    }
  }, [fetchSessions])

  return { sessions, loading, error, refetch: fetchSessions }
}
