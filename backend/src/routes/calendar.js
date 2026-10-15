const express = require('express');
const requireInternalSecret = require('../middleware/internalSecret');
const requireAuth = require('../middleware/auth');
const { getCollection } = require('../db');
const {
  createCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
  deleteCalendarEvent,
} = require('../services/googleCalendar');
const { detectarCategoria } = require('../lib/clasificarCategoria');

const router = express.Router();

function isIsoWithOffset(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/.test(value);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function buildMonthRange(year, month) {
  const start = `${year}-${pad2(month)}-01T00:00:00-05:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad2(month)}-${pad2(lastDay)}T23:59:59-05:00`;
  return { timeMin: start, timeMax: end };
}

function parseMonthParams(query, fallbackDate) {
  const yearParam = query.year ? parseInt(query.year, 10) : null;
  const monthParam = query.month ? parseInt(query.month, 10) : null;

  if (yearParam || monthParam) {
    if (!yearParam || !monthParam || monthParam < 1 || monthParam > 12) {
      return { error: 'invalid_request' };
    }
    return { year: yearParam, month: monthParam };
  }

  return { year: fallbackDate.getFullYear(), month: fallbackDate.getMonth() + 1 };
}

async function getMongoCategoryMap({ google_id, eventIds }) {
  if (!eventIds.length) return new Map();
  const collection = getCollection('eventos');
  const docs = await collection
    .find({ google_id, eventId: { $in: eventIds } })
    .sort({ creado_en: -1 })
    .toArray();

  const map = new Map();
  docs.forEach((doc) => {
    if (!doc.eventId || !doc.categoria || map.has(doc.eventId)) return;
    map.set(doc.eventId, doc.categoria);
  });

  return map;
}

router.post('/eventos', requireInternalSecret, async (req, res) => {
  try {
    const { titulo, start, end, google_id } = req.body || {};

    if (!titulo || !start || !end || !google_id) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Se requiere titulo, start, end y google_id.',
      });
    }

    if (!isIsoWithOffset(start) || !isIsoWithOffset(end)) {
      return res.status(400).json({
        error: 'invalid_datetime_format',
        message: 'start/end deben usar formato YYYY-MM-DDTHH:mm:ss-05:00.',
      });
    }

    const created = await createCalendarEvent({ google_id, titulo, start, end });

    return res.status(201).json({
      ok: true,
      eventId: created.id,
      htmlLink: created.htmlLink,
      status: created.status,
    });
  } catch (err) {
    if (err.code === 'CALENDAR_TOKEN_MISSING_OR_SCOPE') {
      return res.status(403).json({
        error: 'calendar_token_missing_or_scope',
        message: 'Se requiere reautenticacion con permisos de Calendar.',
      });
    }

    if (err.code === 'CALENDAR_TOKEN_INVALID') {
      return res.status(401).json({
        error: 'calendar_token_invalid',
        message: 'Token de Calendar invalido. Reautenticacion requerida.',
      });
    }

    if (err.code === 'GOOGLE_CALENDAR_ERROR') {
      return res.status(502).json({
        error: 'google_calendar_error',
        message: 'No se pudo crear el evento en Google Calendar.',
      });
    }

    console.error('Error en POST /calendar/eventos:', err);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Error interno del servidor.',
    });
  }
});

router.get('/eventos', requireAuth, async (req, res) => {
  try {
    const usuarioId = req.usuario?.google_id;

    if (!usuarioId) {
      return res.status(400).json({ error: 'Usuario no autenticado' });
    }

    const parsed = parseMonthParams(req.query, new Date());
    if (parsed.error) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'year y month deben ser validos (month 1-12).',
      });
    }

    const { timeMin, timeMax } = buildMonthRange(parsed.year, parsed.month);
    const items = await listCalendarEvents({
      google_id: usuarioId,
      timeMin,
      timeMax,
    });

    const eventIds = Array.from(
      new Set(items.map((item) => item.id).filter((id) => typeof id === 'string' && id.length > 0))
    );
    const mongoCategoryMap = await getMongoCategoryMap({ google_id: usuarioId, eventIds });

    const eventos = items.map((item) => {
      const titulo = item.summary || 'Sin titulo';
      const start = item.start?.dateTime || item.start?.date || null;
      const end = item.end?.dateTime || item.end?.date || null;
      const categoriaMongo = mongoCategoryMap.get(item.id);

      return {
        id: item.id,
        titulo,
        start,
        end,
        categoria: categoriaMongo || 'Google Calendar',
      };
    });

    return res.json({ data: eventos });
  } catch (err) {
    if (err.code === 'CALENDAR_TOKEN_MISSING_OR_SCOPE') {
      return res.status(403).json({
        error: 'calendar_token_missing_or_scope',
        message: 'Se requiere reautenticacion con permisos de Calendar.',
      });
    }

    if (err.code === 'CALENDAR_TOKEN_INVALID') {
      return res.status(401).json({
        error: 'calendar_token_invalid',
        message: 'Token de Calendar invalido. Reautenticacion requerida.',
      });
    }

    if (err.code === 'GOOGLE_CALENDAR_ERROR') {
      return res.status(502).json({
        error: 'google_calendar_error',
        message: 'No se pudo leer el calendario de Google.',
      });
    }

    console.error('Error en GET /calendar/eventos:', err);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Error interno del servidor.',
    });
  }
});

router.patch('/eventos/:eventId', requireAuth, async (req, res) => {
  try {
    const usuarioId = req.usuario?.google_id;
    if (!usuarioId) {
      return res.status(400).json({ error: 'Usuario no autenticado' });
    }

    const { eventId } = req.params;
    const { titulo } = req.body || {};

    if (!titulo) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Se requiere titulo.',
      });
    }

    await updateCalendarEvent({ google_id: usuarioId, eventId, titulo });

    const collection = getCollection('eventos');
    const result = await collection.updateMany(
      { google_id: usuarioId, eventId },
      { $set: { titulo } }
    );
    const syncedToMongo = (result && result.matchedCount > 0) || false;

    return res.json({ ok: true, synced_to_mongo: syncedToMongo });
  } catch (err) {
    if (err.code === 'CALENDAR_TOKEN_MISSING_OR_SCOPE') {
      return res.status(403).json({
        error: 'calendar_token_missing_or_scope',
        message: 'Se requiere reautenticacion con permisos de Calendar.',
      });
    }

    if (err.code === 'CALENDAR_TOKEN_INVALID') {
      return res.status(401).json({
        error: 'calendar_token_invalid',
        message: 'Token de Calendar invalido. Reautenticacion requerida.',
      });
    }

    if (err.code === 'GOOGLE_CALENDAR_NOT_FOUND') {
      return res.status(404).json({
        error: 'calendar_event_not_found',
        message: 'El evento no existe en Google Calendar.',
      });
    }

    if (err.code === 'GOOGLE_CALENDAR_ERROR') {
      return res.status(502).json({
        error: 'google_calendar_error',
        message: 'No se pudo actualizar el evento en Google Calendar.',
      });
    }

    console.error('Error en PATCH /calendar/eventos/:eventId:', err);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Error interno del servidor.',
    });
  }
});

router.delete('/eventos/:eventId', requireAuth, async (req, res) => {
  try {
    const usuarioId = req.usuario?.google_id;
    if (!usuarioId) {
      return res.status(400).json({ error: 'Usuario no autenticado' });
    }

    const { eventId } = req.params;

    await deleteCalendarEvent({ google_id: usuarioId, eventId });

    const collection = getCollection('eventos');
    const result = await collection.deleteMany({ google_id: usuarioId, eventId });
    const syncedToMongo = (result && result.deletedCount > 0) || false;

    return res.json({ ok: true, synced_to_mongo: syncedToMongo });
  } catch (err) {
    if (err.code === 'CALENDAR_TOKEN_MISSING_OR_SCOPE') {
      return res.status(403).json({
        error: 'calendar_token_missing_or_scope',
        message: 'Se requiere reautenticacion con permisos de Calendar.',
      });
    }

    if (err.code === 'CALENDAR_TOKEN_INVALID') {
      return res.status(401).json({
        error: 'calendar_token_invalid',
        message: 'Token de Calendar invalido. Reautenticacion requerida.',
      });
    }

    if (err.code === 'GOOGLE_CALENDAR_NOT_FOUND') {
      return res.status(404).json({
        error: 'calendar_event_not_found',
        message: 'El evento no existe en Google Calendar.',
      });
    }

    if (err.code === 'GOOGLE_CALENDAR_ERROR') {
      return res.status(502).json({
        error: 'google_calendar_error',
        message: 'No se pudo eliminar el evento en Google Calendar.',
      });
    }

    console.error('Error en DELETE /calendar/eventos/:eventId:', err);
    return res.status(500).json({
      error: 'internal_error',
      message: 'Error interno del servidor.',
    });
  }
});

module.exports = router;
