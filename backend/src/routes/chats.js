// Rutas para manejar el historial de chats por usuario
const express = require('express');
const router = express.Router();
const { getCollection } = require('../db');

// GET /chats -> sesiones agrupadas por sessionId con último mensaje
router.get('/', async (req, res) => {
  try {
    const collection = getCollection('eventos');

    const sesiones = await collection
      .aggregate([
        { $match: { google_id: req.usuario.google_id, oculto_historial: { $ne: true } } },
        { $sort: { creado_en: 1 } },
        {
          $group: {
            _id: '$sessionId',
            titulo: { $first: '$mensaje_usuario' },
            ultima_actividad: { $max: '$creado_en' },
          },
        },
        {
          $project: {
            _id: 0,
            sessionId: '$_id',
            titulo: 1,
            ultima_actividad: 1,
          },
        },
        { $sort: { ultima_actividad: -1 } },
      ])
      .toArray();

    res.json({ data: sesiones });
  } catch (err) {
    console.error('Error obteniendo historial de chats:', err);
    res.status(500).json({ error: 'No se pudo recuperar el historial de chats' });
  }
});

// GET /chats/:sessionId -> documentos asociados a la sesión del usuario
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const collection = getCollection('eventos');

    const documentos = await collection
      .find({ sessionId, google_id: req.usuario.google_id, oculto_historial: { $ne: true } })
      .sort({ creado_en: 1 })
      .toArray();

    if (!documentos.length) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    res.json({ data: documentos });
  } catch (err) {
    console.error('Error obteniendo sesión de chat:', err);
    res.status(500).json({ error: 'No se pudo recuperar la sesión de chat' });
  }
});

// DELETE /chats/:sessionId -> ocultar historial completo de la sesión
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const collection = getCollection('eventos');

    const result = await collection.updateMany(
      { sessionId, google_id: req.usuario.google_id },
      { $set: { oculto_historial: true } }
    );

    return res.json({ ok: true, updated_count: result?.modifiedCount ?? 0 });
  } catch (err) {
    console.error('Error ocultando sesión de chat:', err);
    res.status(500).json({ error: 'No se pudo ocultar la sesión de chat' });
  }
});

module.exports = router