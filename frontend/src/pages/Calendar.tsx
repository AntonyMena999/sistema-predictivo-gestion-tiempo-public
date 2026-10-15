import { useMemo, useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react"
import api from "@/services/api"
import MetricCard from "@/components/dashboard/MetricCard"
import {
  Button,
  Card,
  CardContent,
  Input,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import Spinner from "@/components/ui/Spinner"
import { cn } from "@/lib/utils"

type CalendarEvent = {
  id: string
  titulo: string
  start: string | null
  end: string | null
  categoria: string
}

type ViewMode = "month" | "week"
type EventPatchPayload = { titulo?: string }

const WEEK_DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]
const KPI_RANGE_MONTHS = 6
const pad2 = (value: number) => String(value).padStart(2, "0")

const calendarScrollbarStyles = `
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

const formatMonthTitle = (value: Date) =>
  new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric" }).format(value)

const formatDateShort = (value: Date) =>
  new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short" }).format(value)

const formatTimeShort = (value: Date) =>
  new Intl.DateTimeFormat("es-EC", { hour: "2-digit", minute: "2-digit" }).format(value)

const formatDateFull = (value: Date) =>
  new Intl.DateTimeFormat("es-EC", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(value)

const getDateKey = (value?: string | null) => (value ? value.slice(0, 10) : null)

const getEventStartDate = (event: CalendarEvent) => {
  if (!event.start) return null
  if (event.start.length === 10) {
    return new Date(`${event.start}T00:00:00-05:00`)
  }
  return new Date(event.start)
}

const getEventEndDate = (event: CalendarEvent) => {
  if (!event.end) return null
  if (event.end.length === 10) {
    return new Date(`${event.end}T00:00:00-05:00`)
  }
  return new Date(event.end)
}

const getWeekStart = (value: Date) => {
  const start = new Date(value)
  start.setHours(0, 0, 0, 0)
  const offset = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - offset)
  return start
}

const formatWeekLabel = (start: Date, end: Date) => {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) {
    const monthLabel = new Intl.DateTimeFormat("es-EC", { month: "short" }).format(end)
    return `${start.getDate()}-${end.getDate()} ${monthLabel}`
  }
  return `${formatDateShort(start)} - ${formatDateShort(end)}`
}

const getDensityStyles = (count: number) => {
  if (count >= 6) {
    return {
      cellClass: "bg-nexora-red/35 border-nexora-red/55",
      badgeClass: "bg-nexora-red/35 text-nexora-red border border-nexora-red/45",
    }
  }
  if (count >= 3) {
    return {
      cellClass: "bg-nexora-red/20 border-nexora-red/35",
      badgeClass: "bg-nexora-red/25 text-nexora-red border border-nexora-red/35",
    }
  }
  if (count >= 1) {
    return {
      cellClass: "bg-sky-400/15 border-sky-300/35",
      badgeClass: "bg-sky-400/20 text-sky-100 border border-sky-300/35",
    }
  }
  return {
    cellClass: "bg-nexora-card/55 border-nexora-border",
    badgeClass: "bg-nexora-card/70 text-nexora-text-tertiary border border-nexora-border",
  }
}

const formatRelativeDayLabel = (value: Date, today: Date) => {
  const start = new Date(value)
  start.setHours(0, 0, 0, 0)
  const base = new Date(today)
  base.setHours(0, 0, 0, 0)
  const diffDays = Math.round((start.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Mañana"
  if (diffDays === -1) return "Ayer"
  return null
}

export default function Calendar() {
  const calendarViewStorageKey = "calendar-view-mode"
  const storedViewMode = typeof window !== "undefined"
    ? localStorage.getItem(calendarViewStorageKey)
    : null
  const initialViewMode: ViewMode = storedViewMode === "week" ? "week" : "month"
  const today = new Date()
  const realYear = today.getFullYear()
  const realMonth = today.getMonth() + 1
  const todayKey = `${realYear}-${pad2(realMonth)}-${pad2(today.getDate())}`
  const [viewDate, setViewDate] = useState(() => new Date(realYear, realMonth - 1, 1))
  const [preferredViewMode, setPreferredViewMode] = useState<ViewMode>(initialViewMode)
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { titulo: string }>>({})
  const [savingEventId, setSavingEventId] = useState<string | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth() + 1
  const viewWeekRange = useMemo(() => {
    const start = getWeekStart(viewDate)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { start, end }
  }, [viewDate])
  const viewTitle = viewMode === "month" ? formatMonthTitle(viewDate) : formatWeekLabel(viewWeekRange.start, viewWeekRange.end)

  const { data: viewData, isLoading: isLoadingView, isError: isErrorView, refetch: refetchView, isFetching: isFetchingView } = useQuery({
    queryKey: ["calendar", viewYear, viewMonth],
    queryFn: async () => {
      const response = await api.get("/calendar/eventos", {
        params: { year: viewYear, month: viewMonth },
      })
      return (response.data?.data || []) as CalendarEvent[]
    },
  })

  const { data: kpiMonthData, isLoading: isLoadingKpiMonth, isError: isErrorKpiMonth, refetch: refetchKpiMonth } = useQuery({
    queryKey: ["calendar-kpi", realYear, realMonth],
    queryFn: async () => {
      const response = await api.get("/calendar/eventos", {
        params: { year: realYear, month: realMonth },
      })
      return (response.data?.data || []) as CalendarEvent[]
    },
  })

  const kpiRangeMonths = useMemo(() => {
    const months: Array<{ year: number; month: number }> = []
    for (let i = 0; i < KPI_RANGE_MONTHS; i += 1) {
      const date = new Date(realYear, realMonth - 1 + i, 1)
      months.push({ year: date.getFullYear(), month: date.getMonth() + 1 })
    }
    return months
  }, [realYear, realMonth])

  const {
    data: kpiRangeData,
    isLoading: isLoadingKpiRange,
    isError: isErrorKpiRange,
    refetch: refetchKpiRange,
  } = useQuery({
    queryKey: ["calendar-kpi-range", realYear, realMonth, KPI_RANGE_MONTHS],
    queryFn: async () => {
      const responses = await Promise.all(
        kpiRangeMonths.map(({ year, month }) =>
          api.get("/calendar/eventos", {
            params: { year, month },
          })
        )
      )
      return responses.flatMap((response) => (response.data?.data || []) as CalendarEvent[])
    },
  })

  const eventos = viewData ?? []
  const eventosKpi = useMemo(() => kpiRangeData ?? [], [kpiRangeData])

  const weekRange = useMemo(() => {
    const start = getWeekStart(today)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }, [today])

  const weekLabel = useMemo(() => formatWeekLabel(weekRange.start, weekRange.end), [weekRange])

  const eventosSemana = useMemo(() => {
    return eventosKpi.filter((event) => {
      const key = getDateKey(event.start)
      if (!key) return false
      const date = new Date(`${key}T00:00:00-05:00`)
      return date >= weekRange.start && date <= weekRange.end
    })
  }, [eventosKpi, weekRange])

  const proximoEvento = useMemo(() => {
    const candidatos = eventosKpi
      .map((event) => ({ event, date: getEventStartDate(event) }))
      .filter(
        (item): item is { event: CalendarEvent; date: Date } =>
          !!item.date && !Number.isNaN(item.date.getTime())
      )
      .filter(({ date }) => date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    return candidatos.length ? candidatos[0] : null
  }, [eventosKpi, today])

  const eventosMismaHora = useMemo(() => {
    if (!proximoEvento) return []
    const referencia = proximoEvento.date.getTime()
    return eventosKpi
      .map((event) => ({ event, date: getEventStartDate(event) }))
      .filter(
        (item): item is { event: CalendarEvent; date: Date } =>
          !!item.date && !Number.isNaN(item.date.getTime())
      )
      .filter(({ date }) => date.getTime() === referencia)
      .sort((a, b) => a.event.titulo.localeCompare(b.event.titulo))
  }, [eventosKpi, proximoEvento])

  const diaMasCargado = useMemo(() => {
    const map = new Map<string, number>()
    ;(kpiMonthData ?? []).forEach((event) => {
      const key = getDateKey(event.start)
      if (!key) return
      map.set(key, (map.get(key) ?? 0) + 1)
    })

    let mejorKey: string | null = null
    let mejorTotal = 0

    map.forEach((total, key) => {
      if (total > mejorTotal) {
        mejorTotal = total
        mejorKey = key
      }
    })

    if (!mejorKey) return null
    const date = new Date(`${mejorKey}T00:00:00-05:00`)
    return { date, total: mejorTotal }
  }, [kpiMonthData])

  const kpiMonthTotals = useMemo(() => {
    const totalEventos = (kpiMonthData ?? []).length
    const totalNoPersonal = (kpiMonthData ?? []).filter(
      (event) => (event.categoria || "Personal") !== "Personal"
    ).length
    return { totalEventos, totalNoPersonal }
  }, [kpiMonthData])

  const calendarCells = useMemo(() => {
    if (viewMode === "week") {
      const start = getWeekStart(viewDate)
      return Array.from({ length: 7 }).map((_, index) => {
        const date = new Date(start)
        date.setDate(start.getDate() + index)
        return { date, inMonth: date.getMonth() === viewDate.getMonth() }
      })
    }

    const firstDay = new Date(viewYear, viewMonth - 1, 1)
    const totalDays = new Date(viewYear, viewMonth, 0).getDate()
    const startOffset = (firstDay.getDay() + 6) % 7
    const cells: Array<{ date: Date; inMonth: boolean }> = []

    for (let i = 0; i < 42; i += 1) {
      const day = i - startOffset + 1
      const date = new Date(viewYear, viewMonth - 1, day)
      const inMonth = day >= 1 && day <= totalDays
      cells.push({ date, inMonth })
    }

    return cells
  }, [viewMode, viewDate, viewYear, viewMonth])

  const eventosPorFechaOrdenados = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    eventos.forEach((event) => {
      const key = getDateKey(event.start)
      if (!key) return
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    })
    map.forEach((list, key) => {
      list.sort((a, b) => {
        const aDate = getEventStartDate(a)
        const bDate = getEventStartDate(b)
        if (!aDate || !bDate) return 0
        const startDiff = aDate.getTime() - bDate.getTime()
        if (startDiff !== 0) return startDiff
        const aEnd = getEventEndDate(a)
        const bEnd = getEventEndDate(b)
        const aEndValue = aEnd ? aEnd.getTime() : Number.POSITIVE_INFINITY
        const bEndValue = bEnd ? bEnd.getTime() : Number.POSITIVE_INFINITY
        return aEndValue - bEndValue
      })
      map.set(key, list)
    })
    return map
  }, [eventos])

  const selectedEvents = useMemo(() => {
    if (!selectedDayKey) return []
    return eventosPorFechaOrdenados.get(selectedDayKey) ?? []
  }, [eventosPorFechaOrdenados, selectedDayKey])

  const selectedDayDate = useMemo(() => {
    if (!selectedDayKey) return null
    return new Date(`${selectedDayKey}T00:00:00-05:00`)
  }, [selectedDayKey])

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)")
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(event.matches)
    }

    handleChange(mediaQuery)
    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(calendarViewStorageKey, preferredViewMode)
    if (isMobile) {
      setViewMode("week")
      setViewDate(new Date())
      return
    }
    setViewMode(preferredViewMode)
    if (preferredViewMode === "week") {
      setViewDate(new Date())
    }
  }, [preferredViewMode, isMobile])

  useEffect(() => {
    if (!selectedDayKey) return
    const nextDrafts: Record<string, { titulo: string }> = {}
    selectedEvents.forEach((event) => {
      nextDrafts[event.id] = {
        titulo: event.titulo,
      }
    })
    setDrafts(nextDrafts)
  }, [selectedDayKey, selectedEvents])

  const nextLabel = useMemo(() => {
    if (!proximoEvento) return "Sin eventos"
    const relativeLabel = formatRelativeDayLabel(proximoEvento.date, today)
    const isAllDay = proximoEvento.event.start?.length === 10
    const timeLabel = isAllDay ? null : formatTimeShort(proximoEvento.date)
    const baseLabel = relativeLabel ?? formatDateShort(proximoEvento.date)
    return timeLabel ? `${baseLabel} • ${timeLabel}` : baseLabel
  }, [proximoEvento, today])
  const nextList = eventosMismaHora.slice(0, 2)
  const nextExtra = eventosMismaHora.length > 2 ? eventosMismaHora.length - 2 : 0
  const nextDescription = proximoEvento ? proximoEvento.event.titulo : "No hay eventos programados"

  const isLoadingKpi = isLoadingKpiMonth || isLoadingKpiRange
  const isError = isErrorView || isErrorKpiMonth || isErrorKpiRange
  const isFetching = isFetchingView

  const invalidateCalendarQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ["calendar"] })
    void queryClient.invalidateQueries({ queryKey: ["calendar-kpi"] })
    void queryClient.invalidateQueries({ queryKey: ["calendar-kpi-range"] })
    void queryClient.invalidateQueries({ queryKey: ["eventos"] })
    void queryClient.invalidateQueries({ queryKey: ["predicciones"] })
  }

  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, payload }: { eventId: string; payload: EventPatchPayload }) =>
      api.patch(`/calendar/eventos/${eventId}`, payload),
    onSuccess: () => {
      invalidateCalendarQueries()
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => api.delete(`/calendar/eventos/${eventId}`),
    onSuccess: () => {
      invalidateCalendarQueries()
    },
  })

  const handlePrev = () => {
    setViewDate((current) => {
      const next = new Date(current)
      if (viewMode === "week") {
        next.setDate(current.getDate() - 7)
        return next
      }
      return new Date(current.getFullYear(), current.getMonth() - 1, 1)
    })
  }

  const handleNext = () => {
    setViewDate((current) => {
      const next = new Date(current)
      if (viewMode === "week") {
        next.setDate(current.getDate() + 7)
        return next
      }
      return new Date(current.getFullYear(), current.getMonth() + 1, 1)
    })
  }

  const handleToday = () => {
    setViewDate(new Date(realYear, realMonth - 1, 1))
  }

  const handleOpenDay = (key: string) => {
    setSelectedDayKey(key)
    setActionError(null)
  }

  const handleCloseDay = () => {
    setSelectedDayKey(null)
    setDrafts({})
    setActionError(null)
    setSavingEventId(null)
    setDeletingEventId(null)
  }

  const handleSaveEvent = async (event: CalendarEvent) => {
    const draft = drafts[event.id]
    if (!draft) return

    const trimmedTitle = draft.titulo.trim()
    const payload: EventPatchPayload = {}

    if (trimmedTitle && trimmedTitle !== event.titulo) {
      payload.titulo = trimmedTitle
    }

    if (!trimmedTitle && draft.titulo !== event.titulo) {
      setActionError("El titulo no puede estar vacio.")
      return
    }

    if (!Object.keys(payload).length) return

    try {
      setSavingEventId(event.id)
      setActionError(null)
      await updateEventMutation.mutateAsync({ eventId: event.id, payload })
    } catch (error) {
      setActionError("No se pudo actualizar el evento. Intenta nuevamente.")
      console.error("Error actualizando evento:", error)
    } finally {
      setSavingEventId(null)
    }
  }

  const handleDeleteEvent = async (event: CalendarEvent) => {
    const confirmDelete = window.confirm("¿Eliminar este evento del calendario?")
    if (!confirmDelete) return

    try {
      setDeletingEventId(event.id)
      setActionError(null)
      await deleteEventMutation.mutateAsync(event.id)
    } catch (error) {
      setActionError("No se pudo eliminar el evento. Intenta nuevamente.")
      console.error("Error eliminando evento:", error)
    } finally {
      setDeletingEventId(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-10 nexora-scrollbar">
      <style>{calendarScrollbarStyles}</style>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <p className="mt-1 text-[16px] text-nexora-text-tertiary">
          Eventos reales sincronizados con tu agenda.
        </p>
      </motion.div>

      {isError && (
        <div className="mb-8 rounded-2xl border border-nexora-border bg-nexora-card px-6 py-5 text-sm text-nexora-text-tertiary">
          No se pudo cargar el calendario. Intenta recargar nuevamente.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <TooltipProvider delay={120}>
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-2 rounded-full border border-nexora-border bg-nexora-card/80 px-3 py-1 text-[12px] text-nexora-text-secondary">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
                <svg viewBox="0 0 24 24" className="h-3 w-3">
                  <path
                    fill="#4285F4"
                    d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9c-.3 1.5-1.2 2.8-2.6 3.6v3h4.2c2.4-2.2 3.8-5.4 3.8-8.4z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.4 0 6.3-1.1 8.4-3l-4.2-3c-1.2.8-2.7 1.3-4.2 1.3-3.2 0-5.9-2.1-6.8-5h-4.3v3.1C2.9 20.7 7.1 23 12 23z"
                  />
                  <path
                    fill="#FBBC04"
                    d="M5.2 13.3c-.2-.6-.4-1.2-.4-1.9s.1-1.3.3-1.9V6.4H.9C0 8.1 0 10 0 11.4c0 1.4.9 3.3 1.3 4.9l3.9-3z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.6c1.9 0 3.6.7 4.9 1.9l3.7-3.7C18.3.9 15.4 0 12 0 7.1 0 2.9 2.3.9 6.4l4.3 3.1C6.1 6.7 8.8 4.6 12 4.6z"
                  />
                </svg>
              </span>
              En vivo desde Google Calendar
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              className="max-w-xs border border-nexora-border bg-nexora-card text-nexora-text"
            >
              Estos KPIs se calculan con datos de tu Google Calendar y pueden variar del Dashboard.

            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="text-[14px] text-nexora-text-tertiary">
          KPIs basados en tu Google Calendar real
        </div>
      </div>

      <div className="mb-8 grid gap-5 lg:grid-cols-3">
        <MetricCard
          icon={CalendarDays}
          title="Eventos de la semana"
          value={isLoadingKpi ? "--" : eventosSemana.length}
          description={weekLabel}
          loading={isLoadingKpi}
        />
        <Card className="rounded-2xl border border-nexora-border bg-nexora-card p-7">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nexora-red/10">
              <Clock className="h-5 w-5 text-nexora-red" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-[13px] font-medium text-nexora-text-tertiary">Proximo evento</p>
          <p className="mt-1 text-[28px] font-bold leading-tight text-nexora-text">
            {isLoadingKpi ? "—" : nextLabel}
          </p>
          <p className="mt-1 text-[12px] text-nexora-text-tertiary">
            {isLoadingKpi ? "Cargando datos" : nextDescription}
          </p>
          {!isLoadingKpi && proximoEvento && eventosMismaHora.length > 1 && (
            <div className="mt-3 max-h-12 space-y-1 overflow-hidden text-[12px] text-nexora-text-secondary">
              {nextList.map((item) => (
                <div key={item.event.id} className="truncate">
                  {item.event.titulo}
                </div>
              ))}
              {nextExtra > 0 && (
                <div className="text-nexora-text-tertiary">+{nextExtra} mas a la misma hora</div>
              )}
            </div>
          )}
        </Card>
        <Card className="rounded-2xl border border-nexora-border bg-nexora-card p-7">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nexora-red/10">
              <Flame className="h-5 w-5 text-nexora-red" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-[13px] font-medium text-nexora-text-tertiary">Dia mas cargado del mes</p>
          <p className="mt-1 text-[28px] font-bold leading-tight text-nexora-text">
            {isLoadingKpi
              ? "—"
              : diaMasCargado
              ? formatRelativeDayLabel(diaMasCargado.date, today) ?? formatDateShort(diaMasCargado.date)
              : "Sin datos"}
          </p>
          <p className="mt-1 text-[12px] text-nexora-text-tertiary">
            {isLoadingKpi
              ? "Cargando datos"
              : diaMasCargado
              ? `${diaMasCargado.total} eventos`
              : kpiMonthTotals.totalEventos > 0
              ? "Sin datos para calcular"
              : "No hay eventos para calcular"}
          </p>
        </Card>
      </div>

      <Card className="rounded-2xl border border-nexora-border bg-nexora-card">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-nexora-text-tertiary">
                Vista {viewMode === "month" ? "mensual" : "semanal"}
              </p>
              <p className="mt-1 text-[18px] font-semibold text-nexora-text">{viewTitle}</p>
              <p className="mt-1 text-[12px] text-nexora-text-tertiary">
                {viewMode === "month"
                  ? "Navega por meses completos"
                  : "Navega por semanas completas"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-nexora-border bg-nexora-card px-1.5 py-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handlePrev}
                  className="text-nexora-red hover:text-nexora-red"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleToday}
                  className="text-nexora-text-tertiary hover:text-nexora-red"
                >
                  {viewMode === "month" ? "Mes actual" : "Semana actual"}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleNext}
                  className="text-nexora-red hover:text-nexora-red"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-nexora-border bg-nexora-card px-1.5 py-1">
                <Button
                  size="sm"
                  variant={viewMode === "month" ? "secondary" : "ghost"}
                  onClick={() => {
                    setPreferredViewMode("month")
                    if (!isMobile) {
                      setViewMode("month")
                    }
                  }}
                  className={
                    viewMode === "month"
                      ? "bg-nexora-red/15 text-nexora-red"
                      : "text-nexora-text-tertiary hover:text-nexora-red"
                  }
                >
                  Mes
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "week" ? "secondary" : "ghost"}
                  onClick={() => {
                    setPreferredViewMode("week")
                    if (!isMobile) {
                      setViewMode("week")
                      setViewDate(new Date())
                    }
                  }}
                  className={
                    viewMode === "week"
                      ? "bg-nexora-red/15 text-nexora-red"
                      : "text-nexora-text-tertiary hover:text-nexora-red"
                  }
                >
                  Semana
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void Promise.all([refetchView(), refetchKpiMonth(), refetchKpiRange()])}
                disabled={isFetching}
                className="border-nexora-red/40 bg-nexora-card text-nexora-red hover:border-nexora-red/60 hover:text-nexora-red"
              >
                {isFetching ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Recargar
              </Button>
              {isLoadingView && <Spinner size="sm" />}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-[10px] sm:text-[12px] text-nexora-text-tertiary">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="text-center font-semibold uppercase tracking-[0.12em]">
                {day}
              </div>
            ))}
          </div>

          <TooltipProvider delay={120}>
            <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarCells.map((cell) => {
                const key = `${cell.date.getFullYear()}-${pad2(cell.date.getMonth() + 1)}-${pad2(
                  cell.date.getDate()
                )}`
                const list = eventosPorFechaOrdenados.get(key) ?? []
                const count = list.length
                const density = getDensityStyles(count)
                const isToday = key === todayKey
                const preview = list.slice(0, 2)
                const extra = count > 2 ? count - 2 : 0
                const content = (
                  <div
                    className={cn(
                      "min-h-[92px] sm:min-h-[118px] rounded-xl border px-2 sm:px-3 py-1.5 sm:py-2 text-left transition-colors",
                      isToday && count === 0 ? "bg-white/15 border-white/30" : density.cellClass,
                      !cell.inMonth && "text-nexora-text-tertiary/60",
                      isToday && "ring-2 ring-nexora-red/60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[11px] sm:text-[12px] font-semibold",
                          isToday
                            ? "bg-nexora-red text-white shadow-[0_0_0_4px_rgba(255,77,79,0.2)]"
                            : "text-nexora-text"
                        )}
                      >
                        {cell.date.getDate()}
                      </span>
                      {cell.inMonth && count > 0 && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleOpenDay(key)
                          }}
                          className="text-nexora-text-tertiary hover:text-nexora-text"
                          aria-label="Editar eventos"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    {count > 0 && (
                      <div className="mt-2 flex justify-end">
                        <span
                          className={cn(
                            "rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold",
                            density.badgeClass
                          )}
                        >
                          {count}
                        </span>
                      </div>
                    )}
                    {count > 0 && (
                      <div className="mt-2.5 sm:mt-3 space-y-1.5 sm:space-y-2">
                        {preview.map((event) => {
                          const startDate = getEventStartDate(event)
                          const timeLabel = startDate && event.start?.length !== 10
                            ? formatTimeShort(startDate)
                            : "Todo el dia"
                          return (
                            <div key={event.id} className="text-[10px] sm:text-[11px]">
                              <div className="text-nexora-text-tertiary">{timeLabel}</div>
                              <div className="line-clamp-2 text-nexora-text-secondary">
                                {event.titulo}
                              </div>
                            </div>
                          )
                        })}
                        {extra > 0 && (
                          <div className="text-[10px] sm:text-[11px] text-nexora-text-tertiary">+{extra} mas</div>
                        )}
                      </div>
                    )}
                    {count === 0 && cell.inMonth && (
                      <p className="mt-3 sm:mt-4 text-[10px] sm:text-[11px] text-nexora-text-tertiary">Sin eventos</p>
                    )}
                    {!cell.inMonth && (
                      <p className="mt-3 sm:mt-4 text-[10px] sm:text-[11px] text-nexora-text-tertiary">Fuera de mes</p>
                    )}
                  </div>
                )

                if (count === 0) return <div key={key}>{content}</div>

                return (
                  <Tooltip key={key}>
                    <TooltipTrigger
                      render={(props) => (
                        <div {...props} className={cn("w-full", props.className)} />
                      )}
                    >
                      {content}
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="start"
                      className="max-w-xs border border-nexora-border bg-nexora-card/95 text-nexora-text shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
                    >
                      <div className="text-[11px] font-semibold text-nexora-text">
                        {formatDateFull(cell.date)}
                      </div>
                      <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-2 nexora-scrollbar">
                        {list.map((event) => {
                          const startDate = getEventStartDate(event)
                          const endDate = getEventEndDate(event)
                          const isAllDay = event.start?.length === 10
                          const timeLabel = startDate && !isAllDay
                            ? endDate
                              ? `${formatTimeShort(startDate)} - ${formatTimeShort(endDate)}`
                              : formatTimeShort(startDate)
                            : "Todo el dia"
                          return (
                            <div
                              key={`${event.id}-full`}
                              className="rounded-md border border-nexora-border/60 bg-nexora-card/80 px-2.5 py-2"
                            >
                              <div className="text-[12px] font-semibold text-nexora-text">
                                {event.titulo}
                              </div>
                              <div className="mt-1 text-[11px] text-nexora-text-tertiary">{timeLabel}</div>
                              <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-nexora-text-tertiary">
                                {event.categoria || "Personal"}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {selectedDayKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl">
            <Card className="border border-nexora-border bg-nexora-card shadow-xl">
              <CardContent className="p-6" onWheel={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-nexora-text-tertiary">
                      Eventos del dia
                    </p>
                    <p className="mt-1 text-[18px] font-semibold text-nexora-text">
                      {selectedDayDate ? formatDateFull(selectedDayDate) : "Seleccionado"}
                    </p>
                  </div>
                  <Button size="icon-sm" variant="ghost" onClick={handleCloseDay}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {actionError && (
                  <div className="mt-4 rounded-xl border border-nexora-border bg-nexora-card/80 px-4 py-3 text-[12px] text-nexora-text-secondary">
                    {actionError}
                  </div>
                )}

                <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-2 nexora-scrollbar">
                  {selectedEvents.length === 0 && (
                    <div className="rounded-xl border border-nexora-border bg-nexora-card/60 px-4 py-5 text-sm text-nexora-text-tertiary">
                      No hay eventos para este dia.
                    </div>
                  )}

                  {selectedEvents.map((event) => {
                    const draft = drafts[event.id] ?? {
                      titulo: event.titulo,
                    }
                    const originalCategoria = event.categoria || "Personal"
                    const startDate = getEventStartDate(event)
                    const endDate = getEventEndDate(event)
                    const isAllDay = event.start?.length === 10
                    const timeLabel = startDate && !isAllDay
                      ? endDate
                        ? `${formatTimeShort(startDate)} - ${formatTimeShort(endDate)}`
                        : formatTimeShort(startDate)
                      : "Todo el dia"
                    const isDirty = draft.titulo.trim() !== event.titulo
                    const isSaving = savingEventId === event.id
                    const isDeleting = deletingEventId === event.id

                    return (
                      <div
                        key={`panel-${event.id}`}
                        className="rounded-2xl border border-nexora-border bg-nexora-card/70 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Input
                              value={draft.titulo}
                              onChange={(eventChange) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [event.id]: {
                                    ...draft,
                                    titulo: eventChange.target.value,
                                  },
                                }))
                              }
                              className="mt-2 h-9 border-nexora-border bg-nexora-card text-nexora-text"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon-sm"
                              variant="destructive"
                              onClick={() => void handleDeleteEvent(event)}
                              disabled={isDeleting || isSaving}
                            >
                              {isDeleting ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="secondary"
                              onClick={() => void handleSaveEvent(event)}
                              disabled={!isDirty || isSaving || isDeleting}
                            >
                              {isSaving ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-nexora-border bg-nexora-card px-3 py-1 text-[12px] font-semibold text-nexora-text">
                            {originalCategoria}
                          </span>
                          <span className="rounded-full border border-nexora-border bg-nexora-card px-3 py-1 text-[12px] font-semibold text-nexora-text">
                            {timeLabel}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {proximoEvento && proximoEvento.event.start && proximoEvento.event.start.length === 10 && (
        <div className="mt-6 text-[12px] text-nexora-text-tertiary">
          Proximo evento es todo el dia: {formatDateShort(proximoEvento.date)}.
        </div>
      )}
    </div>
  )
}
