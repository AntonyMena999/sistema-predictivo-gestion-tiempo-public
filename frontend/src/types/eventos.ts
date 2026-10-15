export interface Evento {
  _id: string
  mensaje_usuario: string
  texto_respuesta: string
  creado_en: string
  categoria?: string
  fecha_evento?: string | null
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse {
  data: Evento[]
  pagination: Pagination
}
