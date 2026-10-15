const express = require('express')
const router = express.Router()
const { getCollection } = require('../db')
const { listCalendarEvents } = require('../services/googleCalendar')

const CATEGORIAS_VALIDAS = [
  'Clases',
  'Exámenes',
  'Entregas',
  'Estudio personal',
  'Trabajos en grupo',
]

const STOPWORDS = new Set([
  'a', 'al', 'algo', 'algun', 'alguna', 'algunas', 'alguno', 'algunos',
  'ante', 'antes', 'asi', 'como', 'con', 'contra', 'cual', 'cuales',
  'cuando', 'cuanto', 'de', 'del', 'desde', 'donde', 'dos', 'el', 'ella',
  'ellas', 'ellos', 'en', 'entre', 'era', 'eres', 'es', 'esa', 'esas', 'ese',
  'eso', 'esos', 'esta', 'estaba', 'estas', 'este', 'estos', 'estoy', 'fue',
  'ha', 'han', 'hasta', 'hay', 'hoy', 'la', 'las', 'le', 'les', 'lo', 'los',
  'mas', 'mi', 'mis', 'mientras', 'muy', 'nada', 'ni', 'no', 'nos', 'nosotros',
  'o', 'para', 'pero', 'poco', 'por', 'porque', 'que', 'quien', 'se', 'sea',
  'ser', 'si', 'sin', 'sobre', 'su', 'sus', 'tambien', 'te', 'tener', 'tiene',
  'toda', 'todas', 'todo', 'todos', 'tu', 'tus', 'un', 'una', 'unas', 'uno',
  'unos', 'y', 'ya', 'ahora', 'manana', 'proximo', 'proxima', 'semana', 'dia',
  'dias', 'hora', 'horas', 'am', 'pm',
])

const KEYWORDS_CATEGORIA = new Set([
  'grupo', 'grupal', 'equipo', 'colaborativo', 'colaborativa',
  'repaso', 'repasos', 'repasar', 'repasando', 'estudio', 'estudios', 'estudiar', 'estudiando',
  'ensayo', 'ensayos', 'ensayar', 'ensayando', 'memorizar', 'memorizando',
  'examen', 'examenes', 'prueba', 'pruebas', 'quiz', 'parcial', 'parciales',
  'evaluacion', 'evaluaciones', 'test', 'supletorio', 'supletorios',
  'sustentacion', 'sustentar', 'sustentando', 'defensa', 'defender', 'defendiendo',
  'leccion', 'lecciones',
  'entrega', 'entregas', 'entregar', 'entregando', 'tarea', 'tareas', 'deber', 'deberes',
  'proyecto', 'proyectos', 'informe', 'informes', 'exposicion', 'exposiciones',
  'taller', 'talleres', 'tesis', 'presentacion', 'presentaciones', 'presentar', 'presentando',
  'clase', 'clases', 'laboratorio', 'laboratorios', 'tutoria', 'tutorias', 'curso', 'cursos',
])

const GENERIC_WORDS = new Set([
  'evento', 'eventos', 'calendario', 'agenda', 'agendar', 'agendado', 'agendada',
  'agendo', 'agende', 'agendamos',
  'programa', 'programar', 'programado', 'programada',
  'reserva', 'reservar', 'reservado',
  'fecha', 'fechas', 'hora', 'horas',
  'sido', 'listo', 'exito', 'exitos', 'buena', 'suerte',
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre',
])

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const extractTokens = (value = '') => {
  const normalized = normalizeText(value)
  return new Set(
    normalized
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token && token.length >= 2)
      .filter((token) => !/^\d+$/.test(token))
      .filter((token) => !STOPWORDS.has(token))
      .filter((token) => !KEYWORDS_CATEGORIA.has(token))
      .filter((token) => !GENERIC_WORDS.has(token))
  )
}

const extractMateria = (mensaje = '', respuesta = '', titulo = '') => {
  const tituloLimpio = typeof titulo === 'string' ? titulo.trim() : ''
  const base = tituloLimpio ? tituloLimpio : `${mensaje} ${respuesta} ${titulo}`
  const tokens = extractTokens(base)
  return [...tokens]
}

const parseDateOnly = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

const pad2 = (value) => String(value).padStart(2, '0')

const formatLocalIsoWithOffset = (date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
    + `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}-05:00`
}

const parseCalendarStart = (value) => {
  if (!value || typeof value !== 'string') return null
  if (value.length === 10) {
    return new Date(`${value}T00:00:00-05:00`)
  }
  return new Date(value)
}

const isCategoriaValida = (categoria) => CATEGORIAS_VALIDAS.includes(categoria)

// GET /predicciones -> indicadores sobre eventos del usuario autenticado
router.get('/', async (req, res) => {
  try {
    const collection = getCollection('eventos')
    const usuarioId = req.usuario?.google_id

    if (!usuarioId) {
      return res.status(400).json({ error: 'Usuario no autenticado' })
    }

    const filter = {
      google_id: usuarioId,
      fecha_evento: { $nin: [null, ''] },
      texto_respuesta: { $not: /ya pasó|error técnico|permiso|reautentic/i },
    }
    const documentos = await collection.find(filter).toArray()
    const documentosNoPersonales = documentos.filter(
      (evento) => isCategoriaValida(evento.categoria)
    )

    const eventosPorDia = new Map()

    documentosNoPersonales.forEach((evento) => {
      const fecha = evento.fecha_evento
      if (!fecha) return

      const lista = eventosPorDia.get(fecha) ?? []
      lista.push(evento)
      eventosPorDia.set(fecha, lista)
    })

    const diasCargados = []

    eventosPorDia.forEach((eventos, fecha) => {
      const total = eventos.length
      const examenesCount = eventos.filter((ev) => ev.categoria === 'Exámenes').length
      const entregasCount = eventos.filter((ev) => ev.categoria === 'Entregas').length
      const motivos = []

      if (examenesCount >= 4) {
        motivos.push('examenes')
      }

      if (entregasCount >= 4) {
        motivos.push('entregas')
      }

      if (examenesCount >= 1 && entregasCount >= 1 && examenesCount + entregasCount >= 4) {
        motivos.push('examen_y_entrega')
      }

      if (motivos.length) {
        diasCargados.push({
          fecha_evento: fecha,
          total_eventos: total,
          eventos: eventos.map((evento) => ({
            mensaje_usuario: evento.mensaje_usuario || '',
            categoria: evento.categoria || '',
            texto_respuesta: evento.texto_respuesta || '',
          })),
          motivo: motivos,
        })
      }
    })

    const hoy = new Date()
    const hoyInicio = new Date(hoy)
    hoyInicio.setHours(0, 0, 0, 0)
    const milisegundosPorDia = 24 * 60 * 60 * 1000

    const examenesConEvento = documentosNoPersonales
      .filter((evento) => evento.categoria === 'Exámenes' && evento.fecha_evento && evento.eventId)

    let calendarioPorEvento = new Map()
    if (examenesConEvento.length) {
      const fechas = examenesConEvento
        .map((evento) => parseDateOnly(evento.fecha_evento))
        .filter(Boolean)

      if (fechas.length) {
        const minDate = new Date(Math.min(...fechas.map((date) => date.getTime())))
        const maxDate = new Date(Math.max(...fechas.map((date) => date.getTime())))
        minDate.setHours(0, 0, 0, 0)
        maxDate.setHours(23, 59, 59, 0)

        try {
          const items = await listCalendarEvents({
            google_id: usuarioId,
            timeMin: formatLocalIsoWithOffset(minDate),
            timeMax: formatLocalIsoWithOffset(maxDate),
          })

          calendarioPorEvento = new Map(
            items
              .map((item) => ({
                id: item?.id,
                start: item?.start?.dateTime || item?.start?.date || null,
              }))
              .filter((item) => item.id && item.start)
              .map((item) => [item.id, item.start])
          )
        } catch (err) {
          if (
            err?.code === 'CALENDAR_TOKEN_MISSING_OR_SCOPE'
            || err?.code === 'CALENDAR_TOKEN_INVALID'
            || err?.code === 'GOOGLE_CALENDAR_ERROR'
          ) {
            console.error('Calendar lookup skipped for predicciones:', err?.code)
          } else {
            throw err
          }
        }
      }
    }

    const estudios = documentosNoPersonales
      .filter((evento) => evento.categoria === 'Estudio personal' && evento.fecha_evento)
      .map((evento) => ({
        fecha: evento.fecha_evento,
        tokens: extractMateria(evento.mensaje_usuario, evento.texto_respuesta, evento.titulo),
      }))
      .filter((evento) => evento.tokens.length > 0)

    const alertas = documentosNoPersonales
      .filter((evento) => evento.categoria === 'Exámenes' && evento.fecha_evento)
      .filter((examen) => {
        const calendarStart = calendarioPorEvento.get(examen.eventId)
        const examenDateTime = calendarStart
          ? parseCalendarStart(calendarStart)
          : parseDateOnly(examen.fecha_evento)

        if (!examenDateTime || Number.isNaN(examenDateTime.getTime())) return false

        const expiresAt = new Date(examenDateTime.getTime() + milisegundosPorDia)
        return expiresAt >= hoy
      })
      .filter((examen) => {
        const examenDate = parseDateOnly(examen.fecha_evento)
        if (!examenDate) return false
        const inicioVentana = new Date(examenDate)
        inicioVentana.setDate(inicioVentana.getDate() - 7)
        const examenTokens = extractMateria(examen.mensaje_usuario, examen.texto_respuesta, examen.titulo)

        if (examenTokens.length === 0) {
          return true
        }

        const tieneEstudioPrevio = estudios.some((estudio) => {
          const estudioDate = parseDateOnly(estudio.fecha)
          if (!estudioDate) return false
          if (estudioDate < inicioVentana || estudioDate > examenDate) return false
          return estudio.tokens.some((token) => examenTokens.includes(token))
        })

        return !tieneEstudioPrevio
      })
      .map((examen) => {
        const calendarStart = calendarioPorEvento.get(examen.eventId)
        const examenDateTime = calendarStart
          ? parseCalendarStart(calendarStart)
          : parseDateOnly(examen.fecha_evento)

        if (!examenDateTime || Number.isNaN(examenDateTime.getTime())) return null

        const expiresAt = new Date(examenDateTime.getTime() + milisegundosPorDia)
        const examenDate = parseDateOnly(examen.fecha_evento)
        const diasRestantes = examenDate
          ? Math.ceil((examenDate.getTime() - hoy.getTime()) / milisegundosPorDia)
          : 0

        return {
          fecha_evento: examen.fecha_evento,
          mensaje_usuario: examen.mensaje_usuario || '',
          texto_respuesta: examen.texto_respuesta || '',
          titulo: examen.titulo || '',
          _id: examen._id ? examen._id.toString() : '',
          dias_restantes: diasRestantes,
          start_at: calendarStart || formatLocalIsoWithOffset(examenDateTime),
          expires_at: formatLocalIsoWithOffset(expiresAt),
        }
      })
      .filter(Boolean)

    const inicioSemana = new Date(hoy)
    inicioSemana.setHours(0, 0, 0, 0)
    inicioSemana.setDate(inicioSemana.getDate() - ((inicioSemana.getDay() + 6) % 7))
    const finSemana = new Date(inicioSemana)
    finSemana.setDate(inicioSemana.getDate() + 6)
    finSemana.setHours(23, 59, 59, 999)

    const conteoCategorias = new Map()

    documentosNoPersonales.forEach((evento) => {
      if (!evento.fecha_evento) return
      const fechaEvento = parseDateOnly(evento.fecha_evento)
      if (!fechaEvento) return
      if (fechaEvento < inicioSemana || fechaEvento > finSemana) return

      const categoria = evento.categoria
      const actual = conteoCategorias.get(categoria) ?? 0
      conteoCategorias.set(categoria, actual + 1)
    })

    res.json({
      data: {
        dias_cargados: diasCargados,
        alertas_examenes_sin_estudio: alertas,
        categorias_semana: Array.from(conteoCategorias.entries()).map(([categoria, total]) => ({
          categoria,
          total,
        })),
      },
    })
  } catch (err) {
    console.error('Error obteniendo predicciones:', err)
    res.status(500).json({ error: 'No se pudo calcular las predicciones' })
  }
})

module.exports = router
