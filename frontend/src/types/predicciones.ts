export interface DiaCargadoEvento {
  mensaje_usuario: string
  categoria: string
  texto_respuesta: string
}

export interface DiaCargado {
  fecha_evento: string
  total_eventos: number
  eventos: DiaCargadoEvento[]
  motivo: string[]
}

export interface AlertaExamen {
  fecha_evento: string
  mensaje_usuario: string
  texto_respuesta: string
  dias_restantes: number
}

export interface CategoriaSemana {
  categoria: string
  total: number
}

export interface PrediccionesResponse {
  data: {
    dias_cargados: DiaCargado[]
    alertas_examenes_sin_estudio: AlertaExamen[]
    categorias_semana: CategoriaSemana[]
  }
}
