import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import MessageBubble from "./MessageBubble"
import type { Message } from "@/types/chat"

interface ChatWindowProps {
  messages: Message[]
  loading: boolean
  error: string | null
}

export default function ChatWindow({ messages, loading, error }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const showTyping = loading && messages.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, showTyping])

  return (
    <div className="flex-1 min-w-0 overflow-y-auto px-6 py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-[800px] flex flex-col gap-10">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {error && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-nexora-border bg-nexora-card px-5 py-3 text-sm text-nexora-text-tertiary"
          >
            {error}
          </div>
        )}

        {showTyping && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex justify-start"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5">
                <Sparkles className="h-4 w-4 text-nexora-text-tertiary" strokeWidth={1.5} />
              </div>
              <div className="rounded-2xl rounded-bl-md border border-nexora-border bg-nexora-card px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-nexora-red animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 rounded-full bg-nexora-red animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 rounded-full bg-nexora-red animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
