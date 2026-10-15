import { motion } from "framer-motion"
import { CalendarDays, AlarmClock, Lightbulb } from "lucide-react"
import { useAuth } from "@/context/useAuth"

const guidanceItems = [
  {
    icon: CalendarDays,
    label: "Contexto Completo",
    example: "\"Agenda mi examen de calculo mañana de 10AM a 12PM\"",
  },
  {
    icon: AlarmClock,
    label: "Categorias",
    example: "\"Agrega asunto especifico para tu categoria academica\"",
  },
  {
    icon: Lightbulb,
    label: "Hora",
    example: "\"Incluye hora de inicio y fin a futuro con AM/PM\"",
  },
]

export default function WelcomeMessage() {
  const { user } = useAuth()
  const firstName = user?.nombre?.split(" ")[0]
  return (
    <div className="flex w-full flex-col items-center justify-center px-4">
      <div
        className="relative flex w-full max-w-[720px] flex-col items-center"
        style={{ gap: "clamp(1rem, 3dvh, 3rem)", paddingTop: "clamp(0.5rem, 3dvh, 3rem)" }}
      >
        <div className="absolute -inset-x-4 -top-12 bottom-0 -z-10 bg-gradient-to-b from-nexora-red/3 via-transparent to-transparent" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex w-full flex-col items-center"
        >
          <h1
            className="font-light text-nexora-text leading-tight tracking-tight"
            style={{ fontSize: "clamp(1.25rem, 3.5dvh, 2.25rem)" }}
          >
            {firstName ? `¿En qué puedo ayudarte, ${firstName}?` : "¿En qué puedo ayudarte?"}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="w-full"
        >
          <div
            className="flex w-full flex-col"
            style={{ gap: "clamp(0.625rem, 1.5dvh, 1rem)" }}
          >
            <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-nexora-text-tertiary">
              Para agendar mejor:
            </p>

            {guidanceItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + index * 0.08, ease: "easeOut" }}
                className="flex w-full items-center gap-3.5 rounded-full border border-nexora-border bg-transparent px-4 lg:px-5 text-left transition-all duration-200 hover:border-nexora-red/40 hover:bg-nexora-red/5"
                style={{ paddingBlock: "clamp(0.625rem, 2dvh, 0.875rem)" }}
              >
                <item.icon
                  className="h-4 w-4 shrink-0 text-nexora-red/70"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span className="text-[15px] font-normal text-nexora-text-secondary">
                  <span className="font-semibold text-nexora-text">{item.label}:</span>
                  <span> </span>
                  <span>{item.example}</span>
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}