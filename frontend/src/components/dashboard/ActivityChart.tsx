import { useMemo } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts"
import { motion } from "framer-motion"
import type { Evento } from "@/types/eventos"

interface ActivityChartProps {
  eventos: Evento[]
}

const CATEGORY_ORDER = [
  "Entregas",
  "Clases",
  "Exámenes",
  "Estudio personal",
  "Trabajos en grupo",
]

const CATEGORY_COLORS: Record<string, string> = {
  "Clases": "#60A5FA",
  "Exámenes": "#F20530",
  "Entregas": "#F59E0B",
  "Estudio personal": "#34D399",
  "Trabajos en grupo": "#A78BFA",
}

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("es-EC", { weekday: "short", day: "numeric" })

const renderTooltip = ({ active, label, payload }: { active?: boolean; label?: string; payload?: Array<{ name: string; value: number }> }) => {
  if (!active || !payload || !payload.length) return null

  const ordered = CATEGORY_ORDER
    .map((category) => payload.find((item) => item.name === category))
    .filter(Boolean) as Array<{ name: string; value: number }>

  return (
    <div className="rounded-xl border border-nexora-border bg-nexora-card px-4 py-3 text-[12px] text-nexora-text">
      <div className="text-[12px] font-semibold text-nexora-text-tertiary">{label}</div>
      <div className="mt-2 space-y-1">
        {ordered.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <span style={{ color: CATEGORY_COLORS[item.name] }}>{item.name}</span>
            <span style={{ color: CATEGORY_COLORS[item.name] }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function groupByDay(eventos: Evento[]) {
  const today = new Date()
  const todayKey = formatDateKey(today)
  const days: Array<Record<string, number> & { date: string; _key: string }> = []

  for (let offset = -7; offset <= 7; offset += 1) {
    const date = new Date(today)
    date.setDate(date.getDate() + offset)
    const key = formatDateKey(date)
    const label = formatDateLabel(date)
    const entry: Record<string, number> & { date: string; _key: string } = {
      date: label,
      _key: key,
    }

    CATEGORY_ORDER.forEach((category) => {
      entry[category] = 0
    })

    days.push(entry)
  }

  eventos.forEach((evento) => {
    const fechaEvento = (evento.fecha_evento || "").trim()
    if (!fechaEvento) return
    if (evento.categoria === "Personal") return
    if (!CATEGORY_ORDER.includes(evento.categoria)) return

    const entry = days.find((d) => d._key === fechaEvento)
    if (!entry) return

    entry[evento.categoria] += 1
  })

  const todayIndex = days.findIndex((d) => d._key === todayKey)
  return {
    data: days,
    todayLabel: days[todayIndex]?.date ?? "",
    futureStartLabel: todayIndex >= 0 && todayIndex + 1 < days.length ? days[todayIndex + 1].date : "",
    futureEndLabel: days.length ? days[days.length - 1].date : "",
  }
}

export default function ActivityChart({ eventos }: ActivityChartProps) {
  const { data, todayLabel, futureStartLabel, futureEndLabel } = useMemo(() => groupByDay(eventos), [eventos])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-2xl border border-nexora-border bg-nexora-card p-7"
    >
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-nexora-text">Actividad reciente</h3>
          <p className="mt-0.5 text-[12px] text-nexora-text-tertiary">
            Ventana de 15 días (7 anteriores + hoy + 7 futuros)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-nexora-text-tertiary">
          {CATEGORY_ORDER.map((category) => (
            <span key={category} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[category] }}
              />
              {category}
            </span>
          ))}
        </div>
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={{ stroke: "#F20530" }}
              tickLine={false}
              tick={{ fill: "#7A7F89", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#7A7F89", fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              content={renderTooltip}
            />
            <ReferenceLine y={0} stroke="#F20530" />
            {todayLabel ? (
              <ReferenceLine x={todayLabel} stroke="#F20530" strokeDasharray="4 4" />
            ) : null}

            {futureStartLabel && futureEndLabel ? (
              <ReferenceArea x1={futureStartLabel} x2={futureEndLabel} fill="rgba(0,0,0,0.18)" />
            ) : null}

            {CATEGORY_ORDER.map((category) => (
              <Area
                key={category}
                type="monotone"
                dataKey={category}
                stroke={CATEGORY_COLORS[category]}
                strokeWidth={1.6}
                strokeOpacity={0.8}
                fill={CATEGORY_COLORS[category]}
                fillOpacity={0.2}
                name={category}
                stackId="events"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
