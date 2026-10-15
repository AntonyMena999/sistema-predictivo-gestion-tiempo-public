import { Sparkles, User } from "lucide-react"
import { motion } from "framer-motion"
import type { Message } from "@/types/chat"
import MarkdownRenderer from "./MarkdownRenderer"

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const isErrored = message.status === "error"

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} ${isErrored ? "opacity-80" : ""}`}
    >
      <div
        className={`flex items-start gap-4 max-w-[85%] min-w-0 ${isUser ? "flex-row-reverse" : ""} ${
          isErrored ? "ring-1 ring-nexora-red/50 rounded-3xl" : ""
        }`}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-nexora-red/10" : "bg-white/5"
            }`}
        >
          {isUser ? (
            <User className="h-4 w-4 text-nexora-red" strokeWidth={1.5} />
          ) : (
            <Sparkles className="h-4 w-4 text-nexora-text-tertiary" strokeWidth={1.5} />
          )}
        </div>

        <div className={`min-w-0 ${isUser ? "text-right" : ""}`}>
          {isUser ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-nexora-text">
              {message.content}
            </p>
          ) : (
            <div className="text-[15px] leading-relaxed text-nexora-text-secondary break-words">
              <MarkdownRenderer content={message.content} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
