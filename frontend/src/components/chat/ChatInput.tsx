import { useState, useRef, type KeyboardEvent } from "react"
import { Send } from "lucide-react"
import { Spinner } from "@/components/ui"

interface ChatInputProps {
  onSend: (message: string) => void
  loading: boolean
  centered?: boolean
}

export default function ChatInput({ onSend, loading, centered }: ChatInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (value.trim() && !loading) {
      onSend(value)
      setValue("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = Math.min(el.scrollHeight, 160) + "px"
    }
  }

  return (
    <div
      className={`w-full ${centered ? "px-4 lg:px-6 py-2 lg:py-4" : "border-t border-nexora-border bg-nexora-bg/80 backdrop-blur-sm px-6 py-5 lg:px-8 lg:py-6"}`}
    >
      <div className="mx-auto max-w-[760px]">
        <div
          className="flex items-end gap-2.5 rounded-[28px] bg-nexora-card/60 backdrop-blur-xl px-5 py-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-nexora-red/20"
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="¿Qué tienes pendiente? Lo agendaré automáticamente en tu Google Calendar."
            rows={1}
            className="min-h-[24px] max-h-[160px] flex-1 resize-none bg-transparent py-2 text-[15px] text-nexora-text placeholder-nexora-text-tertiary outline-none"
          />

          <button
            onClick={handleSend}
            disabled={!value.trim() || loading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nexora-red text-white transition-all duration-200 hover:bg-nexora-red-hover hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
            aria-label={loading ? "Enviando..." : "Enviar mensaje"}
          >
            {loading ? (
              <Spinner size="sm" className="text-white" />
            ) : (
              <Send className="h-4.5 w-4.5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}