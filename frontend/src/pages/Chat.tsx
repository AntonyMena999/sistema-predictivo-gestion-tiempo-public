import { useCallback } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { notifyChatHistoryChanged } from "@/hooks/useChatHistory"
import ChatWindow from "@/components/chat/ChatWindow"
import ChatInput from "@/components/chat/ChatInput"
import WelcomeMessage from "@/components/chat/WelcomeMessage"
import useChat from "@/hooks/useChat"

export default function Chat() {
  const { sessionId: routeSessionId } = useParams<{ sessionId?: string }>()
  const navigate = useNavigate()
  const handleSessionCreated = useCallback(
    (newSessionId: string) => {
      navigate(`/chat/${newSessionId}`, { replace: true })
      notifyChatHistoryChanged()
    },
    [navigate]
  )
  const { messages, loading, sendMessage, error } = useChat(routeSessionId, handleSessionCreated)
  const handleSend = useCallback(
    (message: string) => {
      void sendMessage(message).finally(() => {
        if (routeSessionId) {
          notifyChatHistoryChanged()
        }
      })
    },
    [routeSessionId, sendMessage]
  )
  const hasMessages = messages.length > 0

  return (
    <div
      key={routeSessionId ?? "new"}
      className="grid min-h-0 min-w-0 flex-1 grid-rows-[1fr_auto] overflow-hidden"
    >
      {hasMessages ? (
        <>
          <ChatWindow messages={messages} loading={loading} error={error} />
          <ChatInput onSend={handleSend} loading={loading} />
        </>
      ) : (
        <>
          <div className="flex items-center justify-center px-6 lg:px-8">
            <WelcomeMessage />
          </div>
          <div
            className="flex justify-center px-4 lg:px-6 min-w-0"
            style={{ paddingBottom: "clamp(0.75rem, 2dvh, 2rem)" }}
          >
            <ChatInput onSend={handleSend} loading={loading} centered />
          </div>
        </>
      )}
    </div>
  )
}
