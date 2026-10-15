import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"
import type { PrediccionesResponse, DiaCargado, AlertaExamen, CategoriaSemana } from "@/types/predicciones"

export default function usePredicciones() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["predicciones"],
    queryFn: async () => {
      const response = await api.get<PrediccionesResponse>("/predicciones")
      return response.data
    },
  })

  return {
    diasCargados: data?.data?.dias_cargados ?? ([] as DiaCargado[]),
    alertasExamenes: data?.data?.alertas_examenes_sin_estudio ?? ([] as AlertaExamen[]),
    categoriasSemana: data?.data?.categorias_semana ?? ([] as CategoriaSemana[]),
    loading: isLoading || isFetching,
  }
}
