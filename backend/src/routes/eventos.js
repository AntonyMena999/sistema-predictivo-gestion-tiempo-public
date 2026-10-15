// Rutas para manejar los endpoints relacionados con la colección "eventos"
const express = require('express');
const router = express.Router();
const { getCollection } = require('../db');

// GET /eventos -> devuelve todos los documentos ordenados por creado_en descendente
router.get('/', async (req, res) => {
  try {
    const collection = getCollection('eventos');
    const usuarioId = req.usuario?.google_id;

    if (!usuarioId) {
      return res.status(400).json({ error: 'Usuario no autenticado' });
    }

    // Parámetros de paginación con valores por defecto
    const DEFAULT_PAGE = 1;
    const DEFAULT_LIMIT = 20;

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (Number.isNaN(page) || page < 1) page = DEFAULT_PAGE;
    if (Number.isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;

    const skip = (page - 1) * limit;

    const filter = {
      google_id: usuarioId,
      texto_respuesta: { $not: /ya pasó|error técnico|permiso|reautentic/i },
    };

    // Total de documentos (sin aplicar skip/limit)
    const total = await collection.countDocuments(filter);

    // Obtener documentos paginados con sort, skip y limit
    const eventos = await collection
      .find(filter)
      .sort({ creado_en: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    res.json({
      data: eventos,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Error obteniendo eventos desde MongoDB:', err);
    res.status(500).json({ error: 'No se pudo recuperar los eventos desde la base de datos' });
  }
});

module.exports = router;
