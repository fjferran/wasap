// Servicio para formatear respuestas TwiML y enviar notificaciones WhatsApp

// Genera una respuesta TwiML con el mensaje del asistente
function generarRespuestaTwiML(mensaje) {
  const mensajeEscapado = mensaje
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message><Body>${mensajeEscapado}</Body></Message>
</Response>`;
}

// Genera una respuesta TwiML de error genérico
function generarRespuestaError(telefonoNegocio = '') {
  const contacto = telefonoNegocio ? ` o llamá al ${telefonoNegocio}` : '';
  const mensaje = `Disculpa, estoy teniendo problemas técnicos. Inténtalo de nuevo en unos minutos${contacto}.`;
  return generarRespuestaTwiML(mensaje);
}

// Envía un WhatsApp proactivo al electricista para notificar una emergencia
async function notificarEmergencia(telefonoElectricista, datosEmergencia) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    console.warn('[Twilio] TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no configurados — no se envió notificación');
    return false;
  }

  if (!telefonoElectricista) {
    console.warn('[Twilio] No hay teléfono de notificación configurado');
    return false;
  }

  const { nombre, telefono, descripcion, direccion } = datosEmergencia;

  const mensaje = `🚨 *EMERGENCIA ELÉCTRICA*\n\n` +
    `👤 Cliente: ${nombre || 'Sin nombre'}\n` +
    `📱 Teléfono: ${telefono}\n` +
    `📍 Dirección: ${direccion || 'No especificada'}\n` +
    `⚡ Problema: ${descripcion}\n\n` +
    `Responde a este mensaje para contactar al cliente.`;

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const toNumber = telefonoElectricista.startsWith('whatsapp:')
      ? telefonoElectricista
      : `whatsapp:${telefonoElectricista}`;

    const body = new URLSearchParams({
      From: fromNumber,
      To: toNumber,
      Body: mensaje,
    });

    const respuesta = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    if (respuesta.ok) {
      console.log('[Twilio] Notificación de emergencia enviada al electricista');
      return true;
    } else {
      const error = await respuesta.json();
      console.error('[Twilio] Error enviando notificación:', error.message);
      return false;
    }
  } catch (error) {
    console.error('[Twilio] Error de red al enviar notificación:', error.message);
    return false;
  }
}

// Envía encuesta de satisfacción al cliente cuando el trabajo se marca como completado
async function enviarEncuestaFeedback(telefonoCliente, nombreCliente, tipoTrabajo) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    console.warn('[Twilio] Credenciales no configuradas — no se envió encuesta');
    return false;
  }

  if (!telefonoCliente) {
    console.warn('[Twilio] No hay teléfono de cliente para la encuesta');
    return false;
  }

  const mensaje =
    `✅ *Trabajo completado*\n\n` +
    `Hola ${nombreCliente || 'cliente'} 👋\n\n` +
    `El electricista ha finalizado el trabajo de *${tipoTrabajo || 'tu solicitud'}*.\n\n` +
    `¿Quedaste satisfecho con el servicio?\n\n` +
    `*1* — 👍 Sí, todo perfecto\n` +
    `*2* — 👎 No, hubo problemas\n\n` +
    `Responde con 1 o 2.`;

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const toNumber = telefonoCliente.startsWith('whatsapp:') ? telefonoCliente : `whatsapp:${telefonoCliente}`;

    const body = new URLSearchParams({ From: fromNumber, To: toNumber, Body: mensaje });

    const respuesta = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }
    );

    if (respuesta.ok) {
      console.log('[Twilio] Encuesta de satisfacción enviada al cliente');
      return true;
    } else {
      const error = await respuesta.json();
      console.error('[Twilio] Error enviando encuesta:', error.message);
      return false;
    }
  } catch (error) {
    console.error('[Twilio] Error de red al enviar encuesta:', error.message);
    return false;
  }
}

module.exports = {
  generarRespuestaTwiML,
  generarRespuestaError,
  notificarEmergencia,
  enviarEncuestaFeedback,
};
