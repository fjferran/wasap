const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/mensajes — Devuelve los últimos 50 mensajes ordenados por fecha descendente
router.get('/', (req, res) => {
  try {
    const mensajes = db.prepare(`
      SELECT id, numero_telefono, contenido_mensaje, remitente, tipo_mensaje, procesado, recibido_en
      FROM mensajes_whatsapp
      ORDER BY recibido_en DESC
      LIMIT 50
    `).all();

    res.json(mensajes);
  } catch (error) {
    console.error('[Mensajes] Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error al obtener mensajes', detalle: error.message });
  }
});

// GET /api/mensajes/:numero — Devuelve mensajes de un número específico
router.get('/:numero', (req, res) => {
  try {
    const { numero } = req.params;

    if (!numero) {
      return res.status(400).json({ error: 'Número de teléfono requerido' });
    }

    const mensajes = db.prepare(`
      SELECT id, numero_telefono, contenido_mensaje, remitente, tipo_mensaje, procesado, recibido_en
      FROM mensajes_whatsapp
      WHERE numero_telefono = ?
      ORDER BY recibido_en ASC
      LIMIT 100
    `).all(numero);

    res.json(mensajes);
  } catch (error) {
    console.error('[Mensajes] Error al obtener mensajes del número:', error);
    res.status(500).json({ error: 'Error al obtener mensajes', detalle: error.message });
  }
});

module.exports = router;
