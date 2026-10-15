import { useMemo } from "react"
import { motion } from "framer-motion"
import { Lightbulb } from "lucide-react"
import { Spinner } from "@/components/ui"
import { getSeverityToken, type SeverityLevel } from "@/constants/severity"
import type { Evento } from "@/types/eventos"

interface RecommendationsPanelProps {
  eventos: Evento[]
  loading: boolean
}

const CATEGORY_ORDER = [
  "Entregas",
  "Clases",
  "Exámenes",
  "Estudio personal",
  "Trabajos en grupo",
]

const getWeekBounds = (base: Date) => {
  const start = new Date(base)
  start.setHours(0, 0, 0, 0)
  const offset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - offset)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const parseDateOnly = (value?: string | null) => {
  if (!value || typeof value !== "string") return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export default function RecommendationsPanel({ eventos, loading }: RecommendationsPanelProps) {
  const recomendaciones = useMemo(() => {
    const mensajes: Array<{ mensaje: string; level: SeverityLevel; total?: number }> = []
    const { start, end } = getWeekBounds(new Date())

    const totals = new Map<string, number>()
    CATEGORY_ORDER.forEach((category) => totals.set(category, 0))

    eventos.forEach((evento) => {
      if (!evento.fecha_evento) return
      if (evento.categoria === "Personal") return
      if (!CATEGORY_ORDER.includes(evento.categoria || "")) return
      const date = parseDateOnly(evento.fecha_evento)
      if (!date) return
      if (date < start || date > end) return
      const key = evento.categoria || ""
      totals.set(key, (totals.get(key) ?? 0) + 1)
    })

    CATEGORY_ORDER.forEach((category) => {
      const total = totals.get(category) ?? 0
      if (!total) return
      const level: SeverityLevel = total >= 4 ? "highWarning" : total >= 3 ? "warning" : "info"
      mensajes.push({
        mensaje: `Esta semana tienes ${total} ${category.toLowerCase()} programad${
          total === 1 ? "a" : "as"
        }.`,
        level,
        total,
      })
    })

    if (mensajes.length === 0) {
      mensajes.push({
        mensaje: "Vas al día con tu planificación, ¡sigue así!",
        level: "ok",
      })
    }

    return mensajes
  }, [eventos])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 }}
      className="rounded-2xl border border-nexora-border bg-nexora-card"
    >
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nexora-red/15">
          <Lightbulb className="h-5 w-5 text-nexora-red" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-nexora-text">Recomendaciones</p>
          <p className="text-[12px] text-nexora-text-tertiary">Sugerencias de la semana actual (lun-dom)</p>
        </div>
      </div>
      <div className="px-5 pb-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4">
            {recomendaciones.map((recomendacion, index) => {
              const severity = getSeverityToken(recomendacion.level)
              const SeverityIcon = severity.icon

              return (
                <div
                  key={`${recomendacion.mensaje}-${index}`}
                  className={`rounded-2xl px-4 py-3 text-[14px] text-nexora-text ${severity.itemClassName}`}
                >
                  <p className="flex items-center gap-2">
                    <SeverityIcon className={`h-4 w-4 ${severity.iconClassName}`} />
                    <span>{recomendacion.mensaje}</span>
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
