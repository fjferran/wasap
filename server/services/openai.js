const OpenAI = require('openai');
const db = require('../db');
const { generarHorariosDelDia, formatearFechaLarga } = require('../utils/fechas');
const { notificarEmergencia } = require('./twilio');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Herramientas disponibles para el agente
const herramientas = [
  {
    type: 'function',
    function: {
      name: 'registrar_emergencia',
      description: 'Registra una emergencia eléctrica urgente y notifica al electricista por WhatsApp inmediatamente. Usá esta herramienta cuando el cliente mencione: sin luz, cortocircuito, chispas, humo, incendio, peligro, urgente, emergencia, shock eléctrico o cualquier situación de riesgo.',
      parameters: {
        type: 'object',
        properties: {
          nombre_cliente: { type: 'string', description: 'Nombre del cliente' },
          descripcion_emergencia: { type: 'string', description: 'Descripción detallada de la emergencia' },
          direccion: { type: 'string', description: 'Dirección donde ocurre la emergencia' },
        },
        required: ['descripcion_emergencia'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_disponibilidad',
      description: 'Consulta los horarios disponibles para agendar un trabajo en una fecha específica. Llama SIEMPRE que el cliente proponga una fecha u hora concreta para verificar si el hueco está libre antes de continuar.',
      parameters: {
        type: 'object',
        properties: {
          fecha: { type: 'string', description: 'Fecha a consultar en formato YYYY-MM-DD' },
          hora_solicitada: { type: 'string', description: 'Hora específica que el cliente ha pedido en formato HH:MM (opcional). Si se incluye, la respuesta indicará si está libre y sugerirá las 3 alternativas más cercanas si está ocupada.' },
        },
        required: ['fecha'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ver_solicitudes_cliente',
      description: 'Muestra todas las solicitudes activas del cliente actual',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agendar_trabajo',
      description: 'Agenda un trabajo eléctrico no urgente para una fecha y hora específica',
      parameters: {
        type: 'object',
        properties: {
          nombre_cliente: { type: 'string', description: 'Nombre completo del cliente' },
          fecha_trabajo: { type: 'string', description: 'Fecha y hora en formato ISO (YYYY-MM-DDTHH:MM:SS)' },
          tipo_trabajo: { type: 'string', description: 'Tipo de trabajo: Instalación nueva, Reparación / avería, Presupuesto / visita técnica' },
          direccion: { type: 'string', description: 'Dirección donde se realizará el trabajo' },
          notas: { type: 'string', description: 'Descripción adicional del trabajo (opcional)' },
        },
        required: ['nombre_cliente', 'fecha_trabajo', 'tipo_trabajo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'registrar_feedback',
      description: 'Registra la valoración del cliente sobre un trabajo completado. Úsala cuando el cliente responda a la encuesta de satisfacción con "1" (positiva) o "2" / descripción de problemas (negativa).',
      parameters: {
        type: 'object',
        properties: {
          valoracion: { type: 'string', enum: ['positiva', 'negativa'], description: 'Valoración del cliente' },
          comentario: { type: 'string', description: 'Comentario o motivo del problema (opcional)' },
        },
        required: ['valoracion'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelar_solicitud',
      description: 'Cancela una solicitud existente por su ID',
      parameters: {
        type: 'object',
        properties: {
          id_solicitud: { type: 'integer', description: 'ID numérico de la solicitud a cancelar' },
        },
        required: ['id_solicitud'],
      },
    },
  },
];

// Ejecuta la herramienta correspondiente contra la base de datos
async function ejecutarHerramienta(nombre, argumentos, configuracion, numeroTelefono) {
  // Siempre usar el número real del webhook, ignorar lo que pase la IA
  if (numeroTelefono) argumentos.numero_telefono = numeroTelefono;
  console.log(`[OpenAI] Ejecutando herramienta: ${nombre}`, argumentos);

  switch (nombre) {

    case 'registrar_emergencia': {
      const { numero_telefono, nombre_cliente, descripcion_emergencia, direccion } = argumentos;

      // Crear la solicitud urgente en la base de datos
      const resultado = db.prepare(`
        INSERT INTO turnos (numero_telefono, nombre_paciente, tipo_turno, estado, prioridad, notas)
        VALUES (?, ?, 'Emergencia eléctrica', 'confirmado', 'urgente', ?)
      `).run(numero_telefono, nombre_cliente || 'Sin nombre', descripcion_emergencia);

      // Notificar al electricista por WhatsApp inmediatamente
      const notificado = await notificarEmergencia(configuracion.telefono_notificacion, {
        nombre: nombre_cliente,
        telefono: numero_telefono,
        descripcion: descripcion_emergencia,
        direccion,
      });

      return {
        exito: true,
        id_solicitud: resultado.lastInsertRowid,
        electricista_notificado: notificado,
        mensaje: 'Emergencia registrada y electricista notificado',
      };
    }

    case 'consultar_disponibilidad': {
      const { fecha, hora_solicitada } = argumentos;
      const turnosDelDia = db.prepare(`
        SELECT fecha_turno FROM turnos
        WHERE date(fecha_turno) = date(?) AND estado != 'cancelado'
      `).all(fecha);

      const horariosOcupados = turnosDelDia.map(t => {
        const d = new Date(t.fecha_turno);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      });

      const todosLosHorarios = generarHorariosDelDia();
      const horariosLibres = todosLosHorarios.filter(h => !horariosOcupados.includes(h));

      const resultado = {
        fecha,
        horarios_disponibles: horariosLibres,
        horarios_ocupados: horariosOcupados,
        total_disponibles: horariosLibres.length,
      };

      // Si el cliente pidió una hora concreta, indicar si está libre y sugerir alternativas
      if (hora_solicitada) {
        const horaNorm = hora_solicitada.length === 5 ? hora_solicitada : hora_solicitada.substring(0, 5);
        const libre = !horariosOcupados.includes(horaNorm);
        resultado.hora_solicitada = horaNorm;
        resultado.hora_solicitada_disponible = libre;

        if (!libre) {
          const idx = todosLosHorarios.indexOf(horaNorm);
          const alternativas = [];
          let left = idx - 1;
          let right = idx + 1;
          while (alternativas.length < 3 && (left >= 0 || right < todosLosHorarios.length)) {
            if (right < todosLosHorarios.length && !horariosOcupados.includes(todosLosHorarios[right])) {
              alternativas.push(todosLosHorarios[right]);
            }
            if (left >= 0 && !horariosOcupados.includes(todosLosHorarios[left])) {
              alternativas.push(todosLosHorarios[left]);
            }
            left--;
            right++;
          }
          resultado.alternativas_cercanas = alternativas.sort();
        }
      }

      return resultado;
    }

    case 'ver_solicitudes_cliente': {
      const { numero_telefono } = argumentos;
      const solicitudes = db.prepare(`
        SELECT id, nombre_paciente, fecha_turno, tipo_turno, estado, prioridad, notas
        FROM turnos
        WHERE numero_telefono = ? AND estado != 'cancelado'
        ORDER BY prioridad DESC, creado_en DESC
      `).all(numero_telefono);

      if (solicitudes.length === 0) {
        return { mensaje: 'No tenés solicitudes activas', solicitudes: [] };
      }

      return {
        solicitudes: solicitudes.map(s => ({
          ...s,
          fecha_formateada: s.fecha_turno ? formatearFechaLarga(s.fecha_turno) : 'A coordinar',
        })),
      };
    }

    case 'agendar_trabajo': {
      const { numero_telefono, nombre_cliente, fecha_trabajo, tipo_trabajo, direccion, notas } = argumentos;

      const turnoExistente = db.prepare(`
        SELECT id FROM turnos WHERE fecha_turno = ? AND estado != 'cancelado'
      `).get(fecha_trabajo);

      if (turnoExistente) {
        return { exito: false, mensaje: 'Ese horario ya está ocupado. Elegí otro.' };
      }

      const notaCompleta = [direccion ? `Dirección: ${direccion}` : '', notas || ''].filter(Boolean).join(' | ');

      const resultado = db.prepare(`
        INSERT INTO turnos (numero_telefono, nombre_paciente, fecha_turno, tipo_turno, estado, prioridad, notas)
        VALUES (?, ?, ?, ?, 'confirmado', 'normal', ?)
      `).run(numero_telefono, nombre_cliente, fecha_trabajo, tipo_trabajo, notaCompleta || null);

      return {
        exito: true,
        id_solicitud: resultado.lastInsertRowid,
        mensaje: 'Trabajo agendado correctamente',
        detalle: {
          nombre_cliente,
          fecha: formatearFechaLarga(fecha_trabajo),
          tipo_trabajo,
          direccion: direccion || 'No especificada',
        },
      };
    }

    case 'cancelar_solicitud': {
      const { id_solicitud } = argumentos;
      const solicitud = db.prepare('SELECT * FROM turnos WHERE id = ?').get(id_solicitud);

      if (!solicitud) {
        return { exito: false, mensaje: `No se encontró la solicitud #${id_solicitud}` };
      }

      db.prepare("UPDATE turnos SET estado = 'cancelado' WHERE id = ?").run(id_solicitud);

      return {
        exito: true,
        mensaje: `Solicitud #${id_solicitud} cancelada correctamente`,
      };
    }

    case 'registrar_feedback': {
      const { valoracion, comentario } = argumentos;
      const telBusqueda = numeroTelefono || argumentos.numero_telefono;

      const turno = db.prepare(`
        SELECT id FROM turnos
        WHERE (numero_telefono = ? OR numero_telefono LIKE ?) AND estado = 'completado'
        ORDER BY actualizado_en DESC LIMIT 1
      `).get(telBusqueda, `%${telBusqueda}`);

      if (turno) {
        const feedbackTexto = valoracion === 'positiva'
          ? '👍 Satisfecho'
          : `👎 Insatisfecho${comentario ? ': ' + comentario : ''}`;
        db.prepare("UPDATE turnos SET feedback = ? WHERE id = ?").run(feedbackTexto, turno.id);
      }

      return {
        exito: true,
        valoracion,
        mensaje: valoracion === 'positiva'
          ? 'Valoración positiva registrada'
          : 'Incidencia registrada, se notificará al electricista',
      };
    }

    default:
      return { error: `Herramienta desconocida: ${nombre}` };
  }
}

// Función principal que llama a OpenAI y ejecuta tools si es necesario
async function procesarMensajeConIA(mensajeUsuario, historialMensajes, configuracion, numeroTelefono) {
  const {
    nombre_negocio,
    direccion,
    telefono,
    email,
    horarios,
    servicios,
    sobre_negocio,
    nombre_asistente,
  } = configuracion;

  const nombreAgente = nombre_asistente || 'Alex';

  // Tipos de servicio para citas (excluyendo emergencia)
  const listaServicios = (() => {
    try { return JSON.parse(servicios).filter(s => !s.toLowerCase().includes('emergencia')); }
    catch { return ['Instalación nueva', 'Reparación / avería', 'Presupuesto / visita técnica']; }
  })();
  const submenuCita = listaServicios
    .map((s, i) => `   ${i + 1}. ${s}`)
    .concat([`   ${listaServicios.length + 1}. Otro`])
    .join('\n');

  // Fecha y hora actual para que la IA calcule correctamente fechas relativas
  const ahora = new Date();
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fechaActual = `${diasSemana[ahora.getDay()]} ${ahora.getDate()} de ${meses[ahora.getMonth()]} de ${ahora.getFullYear()}`;
  const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;

  const systemPrompt = `Eres ${nombreAgente}, el asistente virtual de ${nombre_negocio}. Eres profesional, directo y eficiente.

FECHA Y HORA ACTUAL: ${fechaActual}, ${horaActual} (España peninsular)
Usa esta fecha para calcular SIEMPRE con precisión expresiones como:
- "hoy" → ${fechaActual}
- "esta tarde" → hoy ${horaActual.split(':')[0] >= 14 ? 'después de las ' + horaActual : 'por la tarde (a partir de las 15:00)'}
- "mañana" → calcula el día siguiente al ${fechaActual}
- "el lunes próximo", "el próximo martes", etc. → calcula el siguiente día de la semana después de hoy
- "esta semana", "la semana que viene" → calcula a partir del ${fechaActual}
Nunca uses fechas de años anteriores. Si la fecha calculada parece incorrecta, recalcula.

Tu rol es:
- Atender consultas sobre servicios eléctricos
- Detectar y gestionar emergencias eléctricas INMEDIATAMENTE
- Agendar citas para trabajos no urgentes
- Usar español de España (tuteo con "tú")
- Ser claro y conciso

Información del negocio:
- Nombre: ${nombre_negocio}
- Dirección: ${direccion || 'España'}
- Teléfono: ${telefono || 'Consultar por WhatsApp'}
- Email: ${email || 'Consultar por WhatsApp'}
- Horarios: ${horarios || 'Lunes a Viernes 8:00-18:00, Emergencias 24/7'}
- Sobre nosotros: ${sobre_negocio || 'Servicio eléctrico profesional'}
- Número de WhatsApp del cliente actual: ${numeroTelefono} (ya lo tienes, NUNCA lo pidas al cliente)

═══════════════════════════════
MENÚ PRINCIPAL
═══════════════════════════════
Muéstralo SIEMPRE al inicio o cuando el cliente salude:

   1. 🚨 Emergencia eléctrica
   2. 📅 Pedir cita

🔙 Escribe *menú* en cualquier momento para volver aquí.
═══════════════════════════════

REGLAS CRÍTICAS:

0. TELÉFONO OBLIGATORIO: En TODOS los resúmenes y confirmaciones SIEMPRE debes incluir la línea "📱 ${numeroTelefono}" sin excepción. Nunca la omitas.

0b. UN DATO POR MENSAJE: Haz UNA SOLA pregunta por mensaje. Nunca combines dos preguntas en un mismo mensaje. Espera la respuesta antes de preguntar lo siguiente. Si preguntas nombre y dirección a la vez, estás violando esta regla.

1. INICIO: Al primer mensaje o saludo → muestra el menú principal con las 2 opciones.

2. OPCIÓN 1 — EMERGENCIA (flujo en 2 pasos):
   a) Muestra confirmación:
      "⚡ Vas a reportar una EMERGENCIA ELÉCTRICA.
      ¿Confirmas que necesitas atención urgente ahora mismo?
      ✅ Sí, es una emergencia
      🔙 No, volver al menú"
   b) Solo si confirma → pide los datos UNO POR UNO: nombre, dirección y descripción de la emergencia.
   c) Con todos los datos → muestra resumen y pide confirmación final:
      "📋 Resumen de tu emergencia:
      👤 [nombre]
      📱 ${numeroTelefono}
      📍 [dirección]
      ⚡ [descripción]

      ¿Confirmas el aviso?
      ✅ Sí
      ❌ No"
   d) Solo si confirma → llama a registrar_emergencia y responde:
      "✅ Emergencia registrada:
      👤 [nombre]
      📱 ${numeroTelefono}
      📍 [dirección]
      ⚡ [descripción]
      El electricista ha sido avisado y contactará contigo lo antes posible."
   e) Si responde No → responde: "De acuerdo, aviso cancelado. ¿En qué más puedo ayudarte?" y muestra el menú.
   f) Si el cliente menciona: sin luz, cortocircuito, chispas, humo, incendio, shock, quemado → aplica este mismo flujo desde el paso a).

3. OPCIÓN 2 — PEDIR CITA (flujo guiado):
   a) Muestra el submenú de tipo de servicio:
      "📅 ¿Qué tipo de trabajo necesitas?
${submenuCita}
      🔙 Escribe *menú* para volver"
   b) Tras elegir tipo → recoge estos datos UNO POR UNO (una pregunta por mensaje):
      - Nombre completo
      - Fecha y hora preferida → en cuanto el cliente proponga fecha u hora, llama a consultar_disponibilidad con esa fecha y hora_solicitada.
        * Si hora_solicitada_disponible=true → confirma "✅ El hueco de las HH:MM del DÍA está libre." y sigue.
        * Si hora_solicitada_disponible=false → informa "❌ Las HH:MM del DÍA ya están reservadas." y propón las alternativas_cercanas:
          "¿Te viene bien alguna de estas horas?
          ⏰ HH:MM
          ⏰ HH:MM
          ⏰ HH:MM"
          Espera que elija un nuevo hueco libre antes de continuar.
        * Si el cliente solo da fecha sin hora → muestra los horarios_disponibles del día y pide que elija.
      - Dirección donde realizar el trabajo
      - Descripción breve del problema o trabajo
   c) Con todos los datos → muestra resumen y pide confirmación ANTES de registrar:
      "📋 Resumen de tu solicitud:
      👤 [nombre]
      📱 ${numeroTelefono}
      🔧 [tipo de trabajo]
      📅 [fecha y hora]
      📍 [dirección]
      📝 [descripción]

      ¿Confirmas la cita?
      ✅ Sí
      ❌ No"
   d) Solo si responde *Sí* o confirma → llama a agendar_trabajo y responde:
      "✅ ¡Cita registrada!
      👤 [nombre]
      📱 ${numeroTelefono}
      🔧 [tipo de trabajo]
      📅 [fecha y hora]
      📍 [dirección]
      📝 [descripción]
      Nos pondremos en contacto contigo para confirmar.
      🔙 Escribe *menú* si necesitas algo más."
   e) Si responde *No* → responde: "De acuerdo, cita cancelada. ¿En qué más puedo ayudarte?" y muestra el menú.

4. RETROCEDER: Si el cliente escribe "menú", "menu", "volver", "atrás" o "inicio" → muestra el menú principal.

5. FEEDBACK DE TRABAJOS COMPLETADOS:
   - Si el cliente responde "SI", "sí", "si", "todo bien" o similar a la encuesta de satisfacción → llama a registrar_feedback con valoracion="positiva" y responde SOLO: "¡Gracias por tu valoración! 😊 Si necesitas algo más, escribe *menú*."
   - Si responde "NO", "no", o describe un problema → llama a registrar_feedback con valoracion="negativa" y el comentario, y responde SOLO: "Lamentamos los inconvenientes 😔 El electricista se pondrá en contacto contigo. Si necesitas algo más, escribe *menú*."
   - IMPORTANTE: Las respuestas SI/NO a la encuesta NUNCA deben tratarse como opciones del menú principal.

6. Nunca inventes información. Si no puedes resolver algo, ofrece que el electricista llame al cliente.`;

  const mensajesParaOpenAI = [
    { role: 'system', content: systemPrompt },
    ...historialMensajes.map(m => ({
      role: m.remitente === 'usuario' ? 'user' : 'assistant',
      content: m.contenido_mensaje,
    })),
    { role: 'user', content: mensajeUsuario },
  ];

  console.log(`[OpenAI] Enviando ${mensajesParaOpenAI.length} mensajes al modelo`);

  let respuesta = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: mensajesParaOpenAI,
    tools: herramientas,
    tool_choice: 'auto',
    max_tokens: 1000,
  });

  let mensaje = respuesta.choices[0].message;

  // Ejecutar tools si OpenAI las solicita
  while (mensaje.tool_calls && mensaje.tool_calls.length > 0) {
    console.log(`[OpenAI] Ejecutando ${mensaje.tool_calls.length} herramienta(s)`);
    mensajesParaOpenAI.push(mensaje);

    for (const toolCall of mensaje.tool_calls) {
      const nombreFuncion = toolCall.function.name;
      const argumentos = JSON.parse(toolCall.function.arguments);
      const resultado = await ejecutarHerramienta(nombreFuncion, argumentos, configuracion, numeroTelefono);

      mensajesParaOpenAI.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(resultado),
      });
    }

    respuesta = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: mensajesParaOpenAI,
      tools: herramientas,
      tool_choice: 'auto',
      max_tokens: 1000,
    });

    mensaje = respuesta.choices[0].message;
  }

  const textoRespuesta = mensaje.content || 'Disculpá, no pude generar una respuesta. Intentá de nuevo.';
  console.log(`[OpenAI] Respuesta: ${textoRespuesta.substring(0, 100)}...`);

  return textoRespuesta;
}

module.exports = { procesarMensajeConIA };
