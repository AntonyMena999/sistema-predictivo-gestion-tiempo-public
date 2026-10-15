import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, CalendarDays, Trash2 } from "lucide-react"
import { Spinner } from "@/components/ui"
import Pagination from "@/components/ui/Pagination"
import { getSeverityToken, type SeverityLevel } from "@/constants/severity"
import usePredicciones from "@/hooks/usePredicciones"

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
  })

const ITEMS_PER_PAGE = 3

const getAlertaLevel = (diasRestantes: number): SeverityLevel => {
  if (diasRestantes <= 1) return "urgent"
  if (diasRestantes <= 3) return "warning"
  return "info"
}

const getDiaLevel = (motivos: string[], totalEventos: number): SeverityLevel => {
  if (motivos.includes("examen_y_entrega")) return "urgent"
  if (motivos.includes("volumen") && totalEventos >= 4) return "highWarning"
  if (motivos.includes("volumen") && totalEventos === 3) return "warning"
  return "info"
}

const CATEGORY_ORDER = ["Exámenes", "Entregas", "Clases", "Estudio personal", "Trabajos en grupo"]
const CATEGORY_SINGULAR: Record<string, string> = {
  "Exámenes": "Examen",
  "Entregas": "Entrega",
  "Clases": "Clase",
  "Estudio personal": "Estudio personal",
  "Trabajos en grupo": "Trabajo en grupo",
}

const ALERTAS_DISMISS_KEY = "nexora-alertas-descartadas"
const DIAS_PESADOS_DISMISS_KEY = "nexora-dias-pesados-descartados"

const readStorageSet = (key: string) => {
  if (typeof window === "undefined") return new Set<string>()
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set<string>()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set<string>()
    return new Set(parsed.filter((value) => typeof value === "string" && value))
  } catch {
    return new Set<string>()
  }
}

const writeStorageSet = (key: string, values: Set<string>) => {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(Array.from(values)))
}

const emitAlertasChanged = () => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event("nexora-alertas-changed"))
}

const readAlertaId = (alerta: { [key: string]: unknown }) => {
  const value = alerta._id
  return typeof value === "string" ? value : ""
}

const readAlertaTitulo = (alerta: { [key: string]: unknown }, fallback: string) => {
  const value = alerta.titulo
  return typeof value === "string" && value ? value : fallback
}

const readAlertaStartAt = (alerta: { [key: string]: unknown }) => {
  const value = alerta.start_at
  return typeof value === "string" && value ? value : ""
}

const readAlertaExpiresAt = (alerta: { [key: string]: unknown }) => {
  const value = alerta.expires_at
  return typeof value === "string" && value ? value : ""
}

const parseIsoDate = (value?: string) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const parseDateOnly = (dateString?: string) => {
  if (!dateString) return null
  const [year, month, day] = dateString.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

const formatDiasRestantes = (diasRestantes: number) => {
  if (diasRestantes === 0) return "Hoy"
  if (diasRestantes === 1) return "Mañana"
  if (diasRestantes > 1) return `En ${diasRestantes} días`
  const absDias = Math.abs(diasRestantes)
  return `Hace ${absDias} día${absDias === 1 ? "" : "s"}`
}

const formatRelativeDateLabel = (dateString: string, today: Date) => {
  const date = parseDateOnly(dateString)
  if (!date) return formatDate(dateString)
  const base = new Date(today)
  base.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Mañana"
  if (diffDays === -1) return "Ayer"
  return formatDate(dateString)
}

const formatCategoriaResumen = (eventos: Array<{ categoria?: string }>) => {
  const counts = new Map<string, number>()

  eventos.forEach((evento) => {
    const categoria = evento.categoria || ""
    if (!CATEGORY_ORDER.includes(categoria)) return
    counts.set(categoria, (counts.get(categoria) ?? 0) + 1)
  })

  const parts = CATEGORY_ORDER
    .map((categoria) => {
      const total = counts.get(categoria) ?? 0
      if (!total) return null
      const label = total === 1 ? CATEGORY_SINGULAR[categoria] : categoria
      return `${total} ${label.toLowerCase()}`
    })
    .filter(Boolean)

  return parts.length ? parts.join(", ") : "Sin eventos académicos"
}

const buildDiaPesadoResumen = (totalEventos: number, eventos: Array<{ categoria?: string }>) => {
  const categorias = formatCategoriaResumen(eventos)
  if (categorias === "Sin eventos académicos") {
    return `${totalEventos} evento${totalEventos === 1 ? "" : "s"}`
  }
  return `${totalEventos} evento${totalEventos === 1 ? "" : "s"} — ${categorias}`
}

const shouldHideDiaPesado = (dateString: string, today: Date) => {
  const date = parseDateOnly(dateString)
  if (!date) return false
  const base = new Date(today)
  base.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
  return diffDays <= -2
}

export default function PredictionsPanel() {
  const { diasCargados, alertasExamenes, loading } = usePredicciones()
  const [alertasPage, setAlertasPage] = useState(1)
  const [diasPage, setDiasPage] = useState(1)
  const [dismissedAlertas, setDismissedAlertas] = useState<Set<string>>(() => readStorageSet(ALERTAS_DISMISS_KEY))
  const [dismissedDias, setDismissedDias] = useState<Set<string>>(() => readStorageSet(DIAS_PESADOS_DISMISS_KEY))
  const today = new Date()

  const alertasFiltradas = useMemo(() => {
    return alertasExamenes.filter((alerta) => {
      const alertaExpiresAt = readAlertaExpiresAt(alerta as { [key: string]: unknown })
      if (alertaExpiresAt) {
        const expiresDate = parseIsoDate(alertaExpiresAt)
        if (expiresDate && expiresDate < today) return false
      } else if (alerta.dias_restantes <= -1) {
        return false
      }
      const alertaId = readAlertaId(alerta as { [key: string]: unknown })
      if (alertaId && dismissedAlertas.has(alertaId)) return false
      return true
    })
  }, [alertasExamenes, dismissedAlertas])

  const diasFiltrados = useMemo(() => {
    return diasCargados.filter((dia) => {
      if (!dia.fecha_evento) return false
      if (shouldHideDiaPesado(dia.fecha_evento, today)) return false
      if (dismissedDias.has(dia.fecha_evento)) return false
      return true
    })
  }, [diasCargados, dismissedDias, today])

  const alertasTotalPages = Math.max(1, Math.ceil(alertasFiltradas.length / ITEMS_PER_PAGE))
  const diasTotalPages = Math.max(1, Math.ceil(diasFiltrados.length / ITEMS_PER_PAGE))

  const paginatedAlertas = alertasFiltradas.slice(
    (alertasPage - 1) * ITEMS_PER_PAGE,
    alertasPage * ITEMS_PER_PAGE
  )
  const paginatedDias = diasFiltrados.slice((diasPage - 1) * ITEMS_PER_PAGE, diasPage * ITEMS_PER_PAGE)

  useEffect(() => {
    setAlertasPage((prev) => Math.min(prev, alertasTotalPages))
  }, [alertasTotalPages])

  useEffect(() => {
    setDiasPage((prev) => Math.min(prev, diasTotalPages))
  }, [diasTotalPages])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="grid gap-5 lg:grid-cols-2"
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl border border-nexora-border bg-nexora-card"
      >
        <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nexora-red/10">
            <AlertTriangle className="h-5 w-5 text-nexora-red" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-nexora-text">Alertas sin estudio</p>
            <p className="text-[12px] text-nexora-text-tertiary">Exámenes próximos sin repaso</p>
          </div>
        </div>
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : alertasFiltradas.length === 0 ? (
            <div className={`flex flex-col items-center gap-3 rounded-2xl px-4 py-8 text-center text-[13px] text-nexora-text-tertiary ${getSeverityToken("ok").itemClassName}`}>
              {(() => {
                const EmptyIcon = getSeverityToken("ok").icon
                return <EmptyIcon className={`h-6 w-6 ${getSeverityToken("ok").iconClassName}`} />
              })()}
              Vas al día con tu estudio
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedAlertas.map((alerta, index) => {
                const level = getAlertaLevel(alerta.dias_restantes)
                const severity = getSeverityToken(level)
                const SeverityIcon = severity.icon
                const alertaStartAt = readAlertaStartAt(alerta as { [key: string]: unknown })
                const alertaExpiresAt = readAlertaExpiresAt(alerta as { [key: string]: unknown })
                const startDate = parseIsoDate(alertaStartAt)
                const expiresDate = parseIsoDate(alertaExpiresAt)
                const countdownLabel = startDate && expiresDate
                  ? today >= startDate
                    ? "Examen ya pasó"
                    : "Menos de un día"
                  : formatDiasRestantes(alerta.dias_restantes)
                const alertaId = readAlertaId(alerta as { [key: string]: unknown })
                const alertaKey = alertaId || `${alerta.texto_respuesta}-${index}`
                const alertaTitle = readAlertaTitulo(
                  alerta as { [key: string]: unknown },
                  alerta.mensaje_usuario
                )

                return (
                <div
                  key={alertaKey}
                  className={`flex items-start justify-between gap-4 rounded-2xl px-4 py-3 transition-colors ${severity.itemClassName}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[14px] font-medium text-nexora-text">
                      <SeverityIcon className={`h-4 w-4 ${severity.iconClassName}`} />
                      {alertaTitle}
                    </p>
                    <p className="mt-0.5 text-[12px] text-nexora-text-tertiary">
                      {countdownLabel} • {severity.labelEs}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-center">
                    <span className={`text-[12px] font-semibold ${severity.iconClassName}`}>
                      {countdownLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!alertaId) return
                        const next = new Set(dismissedAlertas)
                        next.add(alertaId)
                        setDismissedAlertas(next)
                        writeStorageSet(ALERTAS_DISMISS_KEY, next)
                        emitAlertasChanged()
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border border-nexora-border transition-colors hover:border-nexora-red/40 ${severity.iconClassName}`}
                      aria-label="Descartar alerta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
        {!loading && alertasFiltradas.length > 0 && (
          <Pagination page={alertasPage} totalPages={alertasTotalPages} onPageChange={setAlertasPage} />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="rounded-2xl border border-nexora-border bg-nexora-card"
      >
          <div className="flex items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nexora-red/10">
            <CalendarDays className="h-5 w-5 text-nexora-red" strokeWidth={1.5} />
          </div>
          <div>
              <p className="text-[15px] font-semibold text-nexora-text">Días pesados</p>
              <p className="text-[12px] text-nexora-text-tertiary">Eventos que se juntan en un mismo día</p>
          </div>
        </div>
        <div className="px-5 pb-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : diasFiltrados.length === 0 ? (
            <div className={`flex flex-col items-center gap-3 rounded-2xl px-4 py-8 text-center text-[13px] text-nexora-text-tertiary ${getSeverityToken("ok").itemClassName}`}>
              {(() => {
                const EmptyIcon = getSeverityToken("ok").icon
                return <EmptyIcon className={`h-6 w-6 ${getSeverityToken("ok").iconClassName}`} />
              })()}
              No tienes días críticos por ahora
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedDias.map((dia) => {
                const level = getDiaLevel(dia.motivo, dia.total_eventos)
                const severity = getSeverityToken(level)
                const SeverityIcon = severity.icon
                const fechaLabel = formatRelativeDateLabel(dia.fecha_evento, today)
                const resumenCategorias = buildDiaPesadoResumen(dia.total_eventos, dia.eventos)

                return (
                <div
                  key={dia.fecha_evento}
                  className={`relative rounded-2xl px-4 py-3 pr-12 ${severity.itemClassName}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-2 text-[14px] font-medium text-nexora-text">
                      <SeverityIcon className={`h-4 w-4 ${severity.iconClassName}`} />
                      {fechaLabel}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-[12px] text-nexora-text-tertiary">
                      {resumenCategorias}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(dismissedDias)
                      next.add(dia.fecha_evento)
                      setDismissedDias(next)
                      writeStorageSet(DIAS_PESADOS_DISMISS_KEY, next)
                    }}
                    className={`absolute right-4 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-nexora-border transition-colors hover:border-nexora-red/40 ${severity.iconClassName}`}
                    aria-label="Descartar dia pesado"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )})}
            </div>
          )}
        </div>
        {!loading && diasFiltrados.length > 0 && (
          <Pagination page={diasPage} totalPages={diasTotalPages} onPageChange={setDiasPage} />
        )}
      </motion.div>
    </motion.div>
  )
}
