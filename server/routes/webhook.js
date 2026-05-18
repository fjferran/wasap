const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { procesarMensajeConIA } = require('../services/openai');
const { generarRespuestaTwiML, generarRespuestaError } = require('../services/twilio');

const router = express.Router();

// Rate limiting: máximo 30 requests por minuto por número de teléfono
const limitadorPorNumero = new Map();
function verificarRateLimit(numeroTelefono) {
  const ahora = Date.now();
  const ventana = 60 * 1000; // 1 minuto
  const limite = 30;

  if (!limitadorPorNumero.has(numeroTelefono)) {
    limitadorPorNumero.set(numeroTelefono, []);
  }

  const solicitudes = limitadorPorNumero.get(numeroTelefono);
  // Filtrar solicitudes fuera de la ventana de tiempo
  const solicitudesRecientes = solicitudes.filter(t => ahora - t < ventana);
  limitadorPorNumero.set(numeroTelefono, solicitudesRecientes);

  if (solicitudesRecientes.length >= limite) {
    return false;
  }

  solicitudesRecientes.push(ahora);
  return true;
}

// Limpiar el mapa de rate limiting periódicamente
setInterval(() => {
  const ahora = Date.now();
  const ventana = 60 * 1000;
  for (const [numero, solicitudes] of limitadorPorNumero.entries()) {
    const recientes = solicitudes.filter(t => ahora - t < ventana);
    if (recientes.length === 0) {
      limitadorPorNumero.delete(numero);
    } else {
      limitadorPorNumero.set(numero, recientes);
    }
  }
}, 5 * 60 * 1000);

// POST /api/webhook/whatsapp — Endpoint principal del webhook de Twilio
router.post('/whatsapp', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[Webhook] ${timestamp} — Nuevo mensaje recibido`);

  try {
    // Parsear el body que envía Twilio (application/x-www-form-urlencoded)
    const { Body: contenidoMensaje, From: remitenteBruto } = req.body;

    // Validar que los campos necesarios estén presentes
    if (!contenidoMensaje || !remitenteBruto) {
      console.error('[Webhook] Campos requeridos faltantes en la request');
      return res.status(400).send(generarRespuestaError());
    }

    // Limpiar el prefijo "whatsapp:" que agrega Twilio
    const numeroTelefono = remitenteBruto.replace('whatsapp:', '');
    console.log(`[Webhook] Mensaje de: ${numeroTelefono} | Contenido: "${contenidoMensaje}"`);

    // Verificar rate limit por número de teléfono
    if (!verificarRateLimit(numeroTelefono)) {
      console.warn(`[Webhook] Rate limit excedido para: ${numeroTelefono}`);
      res.setHeader('Content-Type', 'text/xml');
      return res.send(generarRespuestaTwiML('Estás enviando demasiados mensajes. Por favor esperá un minuto antes de continuar.'));
    }

    // Guardar mensaje del usuario en la base de datos
    db.prepare(`
      INSERT INTO mensajes_whatsapp (numero_telefono, contenido_mensaje, remitente, tipo_mensaje)
      VALUES (?, ?, 'usuario', 'texto')
    `).run(numeroTelefono, contenidoMensaje);

    // Obtener la configuración actual del negocio
    const configuracion = db.prepare('SELECT * FROM configuracion_negocio LIMIT 1').get();

    // Traer los últimos 20 mensajes de este número para memoria conversacional
    const historial = db.prepare(`
      SELECT contenido_mensaje, remitente
      FROM mensajes_whatsapp
      WHERE numero_telefono = ?
      ORDER BY recibido_en DESC
      LIMIT 20
    `).all(numeroTelefono).reverse();

    // Llamar al servicio de OpenAI para generar la respuesta
    console.log(`[Webhook] Llamando a OpenAI con historial de ${historial.length} mensajes`);
    const respuestaIA = await procesarMensajeConIA(contenidoMensaje, historial.slice(0, -1), configuracion, numeroTelefono);

    // Guardar la respuesta de la IA en la base de datos
    db.prepare(`
      INSERT INTO mensajes_whatsapp (numero_telefono, contenido_mensaje, remitente, tipo_mensaje, procesado)
      VALUES (?, ?, 'asistente', 'texto', 1)
    `).run(numeroTelefono, respuestaIA);

    // Responder en formato TwiML
    res.setHeader('Content-Type', 'text/xml');
    res.send(generarRespuestaTwiML(respuestaIA));

    console.log(`[Webhook] Respuesta enviada a ${numeroTelefono}`);

  } catch (error) {
    console.error(`[Webhook] Error procesando mensaje:`, error);

    // Obtener teléfono del negocio para el mensaje de error
    let telefonoClinica = '';
    try {
      const config = db.prepare('SELECT telefono FROM configuracion_negocio LIMIT 1').get();
      telefonoClinica = config?.telefono || '';
    } catch {}

    res.setHeader('Content-Type', 'text/xml');
    res.send(generarRespuestaError(telefonoClinica));
  }
});

module.exports = router;
