import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"
import type { PaginatedResponse } from "@/types/eventos"

interface UseEventosOptions {
  page?: number
  limit?: number
}

export default function useEventos({ page = 1, limit = 10 }: UseEventosOptions = {}) {
  const resolvedLimit = Math.max(limit, 120)
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["eventos", page, resolvedLimit],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse>(`/eventos?page=${page}&limit=${resolvedLimit}`)
      return res.data
    },
  })

  const eventos = data?.data ?? []
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 }

  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`

  const eventosHoy = eventos.filter((evento) => {
    if (!evento.fecha_evento) return false
    if ((evento.categoria || "Personal") === "Personal") return false
    return evento.fecha_evento.startsWith(todayString)
  })

  return {
    eventos,
    pagination,
    loading: isLoading || isFetching,
    eventosHoy,
  }
}
