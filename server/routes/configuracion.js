const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/configuracion — Devuelve la configuración del negocio
router.get('/', (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM configuracion_negocio LIMIT 1').get();

    if (!config) {
      return res.status(404).json({ error: 'No se encontró configuración' });
    }

    // Parsear servicios de JSON string a array
    try {
      config.servicios = JSON.parse(config.servicios);
    } catch {
      config.servicios = [];
    }

    res.json(config);
  } catch (error) {
    console.error('[Configuracion] Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración', detalle: error.message });
  }
});

// PUT /api/configuracion — Actualizar la configuración del negocio
router.put('/', (req, res) => {
  try {
    const { nombre_negocio, direccion, telefono, email, horarios, servicios, sobre_negocio, webhook_url, telefono_notificacion, nombre_asistente } = req.body;

    // Convertir array de servicios a JSON string si viene como array
    let serviciosJSON = servicios;
    if (Array.isArray(servicios)) {
      serviciosJSON = JSON.stringify(servicios);
    } else if (typeof servicios === 'string' && !servicios.startsWith('[')) {
      // Si viene como string separado por comas, convertir a JSON array
      const serviciosArray = servicios.split(',').map(s => s.trim()).filter(s => s.length > 0);
      serviciosJSON = JSON.stringify(serviciosArray);
    }

    // Verificar si ya existe un registro de configuración
    const configExistente = db.prepare('SELECT id FROM configuracion_negocio LIMIT 1').get();

    if (configExistente) {
      db.prepare(`
        UPDATE configuracion_negocio
        SET nombre_negocio = ?,
            direccion = ?,
            telefono = ?,
            email = ?,
            horarios = ?,
            servicios = ?,
            sobre_negocio = ?,
            webhook_url = ?,
            telefono_notificacion = ?,
            nombre_asistente = ?,
            actualizado_en = datetime('now', 'localtime')
        WHERE id = ?
      `).run(
        nombre_negocio,
        direccion,
        telefono,
        email,
        horarios,
        serviciosJSON,
        sobre_negocio,
        webhook_url,
        telefono_notificacion,
        nombre_asistente,
        configExistente.id
      );
    } else {
      db.prepare(`
        INSERT INTO configuracion_negocio
        (nombre_negocio, direccion, telefono, email, horarios, servicios, sobre_negocio, webhook_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(nombre_negocio, direccion, telefono, email, horarios, serviciosJSON, sobre_negocio, webhook_url);
    }

    // Retornar la configuración actualizada
    const configActualizada = db.prepare('SELECT * FROM configuracion_negocio LIMIT 1').get();
    try {
      configActualizada.servicios = JSON.parse(configActualizada.servicios);
    } catch {
      configActualizada.servicios = [];
    }

    console.log('[Configuracion] Configuración actualizada correctamente');
    res.json(configActualizada);
  } catch (error) {
    console.error('[Configuracion] Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración', detalle: error.message });
  }
});

module.exports = router;
