import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BookOpen, CalendarDays, FileText, Package, School, TrendingUp, Users } from "lucide-react"
import { useAuth } from "@/context/useAuth"
import MetricCard from "@/components/dashboard/MetricCard"
import ActivityChart from "@/components/dashboard/ActivityChart"
import useEventos from "@/hooks/useEventos"
import usePredicciones from "@/hooks/usePredicciones"
import PredictionsPanel from "@/components/dashboard/PredictionsPanel"
import RecommendationsPanel from "@/components/dashboard/RecommendationsPanel"

export default function Dashboard() {
  const { user } = useAuth()
  const { eventos, pagination, loading, eventosHoy } = useEventos({ page: 1, limit: 50 })
  const { alertasExamenes, categoriasSemana, loading: predictionsLoading } = usePredicciones()
  const [alertasVersion, setAlertasVersion] = useState(0)
  const today = new Date()
  useEffect(() => {
    const handleAlertasChanged = () => {
      setAlertasVersion((prev) => prev + 1)
    }

    window.addEventListener("nexora-alertas-changed", handleAlertasChanged)
    window.addEventListener("storage", handleAlertasChanged)

    return () => {
      window.removeEventListener("nexora-alertas-changed", handleAlertasChanged)
      window.removeEventListener("storage", handleAlertasChanged)
    }
  }, [])
  const dismissedAlertas = (() => {
    const _version = alertasVersion
    void _version
    if (typeof window === "undefined") return new Set<string>()
    try {
      const raw = localStorage.getItem("nexora-alertas-descartadas")
      const parsed = raw ? JSON.parse(raw) : []
      return new Set(Array.isArray(parsed) ? parsed : [])
    } catch {
      return new Set<string>()
    }
  })()

  const parseIsoDate = (value?: string) => {
    if (!value) return null
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
  }

  const alertasKpi = alertasExamenes.filter((alerta) => {
    const alertaId = (alerta as { [key: string]: unknown })._id
    if (typeof alertaId === "string" && dismissedAlertas.has(alertaId)) return false
    const expiresAt = (alerta as { [key: string]: unknown }).expires_at
    if (typeof expiresAt === "string") {
      const expiresDate = parseIsoDate(expiresAt)
      if (expiresDate && expiresDate < today) return false
    } else if (alerta.dias_restantes <= -1) {
      return false
    }
    return true
  })
  const categoriasOrdenadas = [
    "Entregas",
    "Clases",
    "Exámenes",
    "Estudio personal",
    "Trabajos en grupo",
  ]
  const categoriasMap = new Map<string, number>()
  categoriasOrdenadas.forEach((categoria) => categoriasMap.set(categoria, 0))
  eventos.forEach((evento) => {
    const categoria = evento.categoria || "Personal"
    if (categoria === "Personal") return
    if (!categoriasMap.has(categoria)) return
    categoriasMap.set(categoria, (categoriasMap.get(categoria) ?? 0) + 1)
  })
  const categoriaIconos: Record<string, typeof FileText> = {
    "Exámenes": FileText,
    "Entregas": Package,
    "Clases": School,
    "Estudio personal": BookOpen,
    "Trabajos en grupo": Users,
  }

  const dashboardScrollbarStyles = `
    .nexora-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #F20530 rgba(255, 255, 255, 0.08);
    }

    .nexora-scrollbar::-webkit-scrollbar {
      width: 6px;
    }

    .nexora-scrollbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 9999px;
    }

    .nexora-scrollbar::-webkit-scrollbar-thumb {
      background: #F20530;
      border-radius: 9999px;
    }

    .nexora-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #ff2b4e;
    }
  `

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-10 nexora-scrollbar">
      <style>{dashboardScrollbarStyles}</style>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-10"
      >
        <h2 className="text-[24px] font-bold text-nexora-text">
          Hola, {user?.nombre?.split(" ")[0] || "Usuario"}
        </h2>
        <p className="mt-1 text-[16px] text-nexora-text-tertiary">
          Así va tu semana académica
        </p>
      </motion.div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <MetricCard
          icon={CalendarDays}
          title="Eventos hoy"
          value={eventosHoy.length}
          description="Lo que tienes programado hoy"
          loading={loading}
        />
        <MetricCard
          icon={TrendingUp}
          title="Alertas"
          value={alertasKpi.length}
          description="Exámenes sin repaso previo"
          loading={predictionsLoading}
        />
      </div>

      <div className="mb-8">
        <ActivityChart eventos={eventos} />
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold text-nexora-text">Categorías de eventos</p>
            <p className="text-[12px] text-nexora-text-tertiary">
              Total de eventos académicos por categoría
            </p>
          </div>
        </div>

        {predictionsLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoriasOrdenadas.map((categoria) => (
              <div key={categoria} className="h-16 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {categoriasOrdenadas.map((categoria, index, items) => {
              const hasCenteredLastRow = items.length % 3 === 2
              const isPenultimate = hasCenteredLastRow && index === items.length - 2
              const isLast = hasCenteredLastRow && index === items.length - 1
              return (
                <div
                  key={categoria}
                  className={`flex flex-col items-center justify-center rounded-2xl border border-nexora-border bg-nexora-card px-5 py-4 text-center lg:col-span-2 ${
                    isPenultimate ? "lg:col-start-2" : ""
                  } ${isLast ? "lg:col-start-4" : ""}`}
                >
                  <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-nexora-text-tertiary">
                    {(() => {
                      const Icon = categoriaIconos[categoria]
                      return Icon ? <Icon className="h-3.5 w-3.5 text-nexora-red" /> : null
                    })()}
                    <span>{categoria}</span>
                  </div>
                  <p className="mt-2 text-[22px] font-semibold text-nexora-text">
                    {categoriasMap.get(categoria) ?? 0}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mb-8">
        <PredictionsPanel />
      </div>

      <div className="mb-8 flex justify-center">
        <div className="w-full max-w-3xl">
          <RecommendationsPanel eventos={eventos} loading={loading} />
        </div>
      </div>
    </div>
  )
}
