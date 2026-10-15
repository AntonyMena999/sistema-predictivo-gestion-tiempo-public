import { useState, useCallback, useRef, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import api from "../services/api"
import type { Message } from "../types/chat"

const sessionMessagesCache = new Map<string, Message[]>()

interface SendMessageResponse {
  sessionId: string
  output: string
}

const shouldInvalidateAfterConfirmation = (output: string) => {
  const normalized = output.toLowerCase()
  return /(agend|program|reserv|cread)/.test(normalized)
}

export default function useChat(
  activeSessionId?: string,
  onSessionCreated?: (sessionId: string) => void
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingSessionKey, setLoadingSessionKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const queryClient = useQueryClient()

  const activeSessionKey = activeSessionId ?? "__new__"

  useEffect(() => {
    sessionIdRef.current = activeSessionId ?? null
    setSessionId(activeSessionId ?? null)
    setError(null)

    if (!activeSessionId) {
      setMessages([])
      return
    }

    let active = true

    const cachedMessages = sessionMessagesCache.get(activeSessionId)
    if (cachedMessages) {
      setMessages(cachedMessages)
      return
    }

    setMessages([])

    const loadHistory = async () => {
      try {
        const response = await api.get<{ data: Array<{ mensaje_usuario?: string; texto_respuesta?: string; creado_en?: string }> }>(
          `/api/chats/${activeSessionId}`
        )

        if (!active) return

        const documentos = response.data.data ?? []
        const historyMessages: Message[] = documentos.flatMap((documento) => {
          const timestamp = documento.creado_en ? new Date(documento.creado_en) : new Date()
          const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: documento.mensaje_usuario ?? "",
            timestamp,
          }
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: documento.texto_respuesta ?? "",
            timestamp,
          }
          return [userMessage, assistantMessage]
        })

        setMessages(historyMessages)
        sessionMessagesCache.set(activeSessionId, historyMessages)
      } catch {
        if (!active) return
        setMessages([])
      }
    }

    loadHistory()

    return () => {
      active = false
    }
  }, [activeSessionId])

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    const sessionKey = sessionIdRef.current ?? "__new__"

    if (!content.trim() || (loading && loadingSessionKey === sessionKey)) return false

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setLoading(true)
    setLoadingSessionKey(sessionKey)
    setError(null)

    try {
      const response = await api.post<SendMessageResponse>("/api/chat", {
        mensaje: content.trim(),
        sessionId: sessionIdRef.current,
      })

      const { sessionId: newSessionId, output } = response.data

      if (newSessionId && !sessionIdRef.current) {
        sessionIdRef.current = newSessionId
        setSessionId(newSessionId)
        onSessionCreated?.(newSessionId)
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: (() => {
          const raw = typeof output === "string" ? output : JSON.stringify(output)
          return raw.trim().length > 0
            ? raw
            : "No se pudo generar una respuesta. Intenta reformular tu mensaje o vuelve a intentarlo."
        })(),
        timestamp: new Date(),
      }

      if (shouldInvalidateAfterConfirmation(assistantMessage.content)) {
        void queryClient.invalidateQueries({ queryKey: ["eventos"] })
        void queryClient.invalidateQueries({ queryKey: ["predicciones"] })
      }

      setMessages((prev) => {
        const nextMessages = [...prev, assistantMessage]
        const storedSessionId = sessionIdRef.current ?? newSessionId
        if (storedSessionId) {
          sessionMessagesCache.set(storedSessionId, nextMessages)
        }
        return nextMessages
      })
      return true
    } catch (error) {
      const isGatewayTimeout = axios.isAxiosError(error) && error.response?.status === 502
      const errorMessage = isGatewayTimeout
        ? "El servicio de IA está tardando más de lo esperado. Es posible que tu solicitud sí se haya procesado — revisa tu calendario, o intenta de nuevo."
        : "Error al enviar el mensaje. Intenta de nuevo."

      setError(errorMessage)
      setMessages((prev) => {
        const nextMessages = prev.map((message) =>
          message.id === userMessage.id ? { ...message, status: "error" as const } : message
        )
        const currentSessionId = sessionIdRef.current
        if (currentSessionId) {
          sessionMessagesCache.set(currentSessionId, nextMessages)
        }
        return nextMessages
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [loading, loadingSessionKey, onSessionCreated, queryClient])

  const clearMessages = useCallback(() => {
    setMessages([])
    setSessionId(null)
    sessionIdRef.current = null
    setError(null)
  }, [])

  return {
    messages,
    sessionId,
    loading: loading && loadingSessionKey === activeSessionKey,
    error,
    sendMessage,
    clearMessages,
  }
}
