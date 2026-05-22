const express = require('express');
const db = require('../db');
const { enviarEncuestaFeedback } = require('../services/twilio');

const router = express.Router();

// GET /api/turnos — Devuelve todos los turnos
router.get('/', (req, res) => {
  try {
    const turnos = db.prepare(`
      SELECT id, numero_telefono, nombre_paciente, fecha_turno, tipo_turno, estado, prioridad, notas, feedback, creado_en, actualizado_en
      FROM turnos
      ORDER BY prioridad DESC, fecha_turno DESC
    `).all();

    res.json(turnos);
  } catch (error) {
    console.error('[Turnos] Error al obtener turnos:', error);
    res.status(500).json({ error: 'Error al obtener turnos', detalle: error.message });
  }
});

// GET /api/turnos/:fecha — Devuelve los turnos de una fecha específica (formato: YYYY-MM-DD)
router.get('/:fecha', (req, res) => {
  try {
    const { fecha } = req.params;

    // Validar formato de fecha básico
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Usar YYYY-MM-DD' });
    }

    const turnos = db.prepare(`
      SELECT id, numero_telefono, nombre_paciente, fecha_turno, tipo_turno, estado, prioridad, notas, creado_en
      FROM turnos
      WHERE date(fecha_turno) = date(?)
      ORDER BY fecha_turno ASC
    `).all(fecha);

    res.json(turnos);
  } catch (error) {
    console.error('[Turnos] Error al obtener turnos por fecha:', error);
    res.status(500).json({ error: 'Error al obtener turnos', detalle: error.message });
  }
});

// POST /api/turnos — Crear un nuevo turno manualmente desde el dashboard
router.post('/', (req, res) => {
  try {
    const { numero_telefono, nombre_paciente, fecha_turno, tipo_turno, notas } = req.body;

    // Validar campos requeridos
    if (!numero_telefono || !nombre_paciente || !fecha_turno || !tipo_turno) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        detalle: 'Se requieren: numero_telefono, nombre_paciente, fecha_turno, tipo_turno',
      });
    }

    const resultado = db.prepare(`
      INSERT INTO turnos (numero_telefono, nombre_paciente, fecha_turno, tipo_turno, estado, notas)
      VALUES (?, ?, ?, ?, 'confirmado', ?)
    `).run(numero_telefono, nombre_paciente, fecha_turno, tipo_turno, notas || null);

    const turnoCreado = db.prepare('SELECT * FROM turnos WHERE id = ?').get(resultado.lastInsertRowid);

    res.status(201).json(turnoCreado);
  } catch (error) {
    console.error('[Turnos] Error al crear turno:', error);
    res.status(500).json({ error: 'Error al crear turno', detalle: error.message });
  }
});

// PUT /api/turnos/:id — Actualizar el estado u otros campos de un turno
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas, fecha_turno } = req.body;

    const turnoExistente = db.prepare('SELECT * FROM turnos WHERE id = ?').get(id);
    if (!turnoExistente) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const estadosValidos = ['pendiente', 'confirmado', 'cancelado', 'completado'];
    if (estado && !estadosValidos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}` });
    }

    const campos = [];
    const valores = [];

    if (estado) { campos.push('estado = ?'); valores.push(estado); }
    if (notas !== undefined) { campos.push('notas = ?'); valores.push(notas); }
    if (fecha_turno) { campos.push('fecha_turno = ?'); valores.push(fecha_turno); }

    if (campos.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    valores.push(id);
    db.prepare(`UPDATE turnos SET ${campos.join(', ')} WHERE id = ?`).run(...valores);

    const turnoActualizado = db.prepare('SELECT * FROM turnos WHERE id = ?').get(id);
    res.json(turnoActualizado);

    // Enviar encuesta de satisfacción al completar (sin bloquear la respuesta)
    if (estado === 'completado' && turnoExistente.estado !== 'completado') {
      // Buscar el número canónico de Twilio (con prefijo de país) en el historial de mensajes
      const telGuardado = turnoExistente.numero_telefono;
      const msgRecord = db.prepare(`
        SELECT numero_telefono FROM mensajes_whatsapp
        WHERE numero_telefono LIKE ? OR numero_telefono = ?
        ORDER BY recibido_en DESC LIMIT 1
      `).get(`%${telGuardado}`, telGuardado);
      const telefonoReal = msgRecord?.numero_telefono || telGuardado;

      console.log(`[Turnos] Enviando encuesta a ${telefonoReal} (guardado: ${telGuardado})`);
      enviarEncuestaFeedback(
        telefonoReal,
        turnoExistente.nombre_paciente,
        turnoExistente.tipo_turno
      ).then(enviado => {
        if (enviado) {
          const textoEncuesta =
            `✅ Trabajo completado\n\n` +
            `Hola ${turnoExistente.nombre_paciente || 'cliente'} 👋\n\n` +
            `El electricista ha finalizado el trabajo de ${turnoExistente.tipo_turno || 'tu solicitud'}.\n\n` +
            `¿Quedaste satisfecho con el servicio?\n\n` +
            `SI — 👍 Todo perfecto\n` +
            `NO — 👎 Hubo problemas\n\n` +
            `Responde con SI o NO y si hay algún problema te pediremos que nos cuentes qué ocurrió.`;
          db.prepare(`
            INSERT INTO mensajes_whatsapp (numero_telefono, contenido_mensaje, remitente, tipo_mensaje, procesado)
            VALUES (?, ?, 'asistente', 'texto', 1)
          `).run(telefonoReal, textoEncuesta);
        }
      }).catch(err => console.error('[Turnos] Error enviando encuesta:', err));
    }
  } catch (error) {
    console.error('[Turnos] Error al actualizar turno:', error);
    res.status(500).json({ error: 'Error al actualizar turno', detalle: error.message });
  }
});

// DELETE /api/turnos/:id — Cancelar un turno (cambiar estado a cancelado)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const turno = db.prepare('SELECT id FROM turnos WHERE id = ?').get(id);
    if (!turno) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    db.prepare("UPDATE turnos SET estado = 'cancelado' WHERE id = ?").run(id);

    res.json({ mensaje: 'Turno cancelado correctamente' });
  } catch (error) {
    console.error('[Turnos] Error al cancelar turno:', error);
    res.status(500).json({ error: 'Error al cancelar turno', detalle: error.message });
  }
});

module.exports = router;
