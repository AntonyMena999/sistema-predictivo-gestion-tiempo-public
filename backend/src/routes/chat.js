// Rutas para manejar el endpoint de chat y reenviar mensajes a n8n
const express = require('express');
const axios = require('axios');
const { randomUUID } = require('crypto');
const router = express.Router();

// Usar la URL del webhook desde la variable de entorno N8N_WEBHOOK_URL
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

// POST /chat -> recibe { mensaje: string, sessionId?: string } y lo reenvía a n8n
router.post('/', async (req, res) => {
  try {
    const { mensaje, sessionId } = req.body || {};

    if (!mensaje) {
      return res.status(400).json({ error: 'mensaje es requerido' });
    }

    // Usar sessionId provisto por el cliente; si no existe, generar uno nuevo
    let sid = sessionId;
    let generated = false;
    if (!sid) {
      sid = randomUUID();
      generated = true;
    }

    // n8n espera el body con el campo `chatInput` en el nodo "When chat message received"
    const payload = { chatInput: mensaje, sessionId: sid, google_id: req.usuario.google_id };

    if (!N8N_WEBHOOK_URL) {
      console.error('N8N_WEBHOOK_URL no está configurada en las variables de entorno');
      return res.status(500).json({ error: 'configuración del servicio de chat no encontrada' });
    }

    const n8nResponse = await axios.post(N8N_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 90000,
    });

    // Extraer el texto plano de salida que devuelve n8n (n8nResponse.data.output)
    const output = (n8nResponse && n8nResponse.data && typeof n8nResponse.data.output !== 'undefined')
      ? n8nResponse.data.output
      : '';

    // Responder siempre con la misma forma: { sessionId, output }
    return res.json({ sessionId: sid, output });
  } catch (err) {
    console.error('Error enviando mensaje al webhook de n8n:', err);
    return res.status(502).json({ error: 'no se pudo conectar con el servicio de chat' });
  }
});

module.exports = router; 
