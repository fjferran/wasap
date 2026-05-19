# Electricista 24hs — Contexto del proyecto

## Qué es esto
Asistente de WhatsApp con IA para un servicio de electricidad. Los clientes escriben por WhatsApp → Twilio recibe el mensaje → el servidor procesa con GPT-4o → responde automáticamente y guarda los datos en SQLite. El dashboard (React) muestra y gestiona los trabajos en tiempo real.

## Stack
- **Backend**: Node.js + Express + better-sqlite3
- **IA**: OpenAI GPT-4o con function calling (herramientas definidas en `server/services/openai.js`)
- **WhatsApp**: Twilio webhook
- **Frontend**: React + Vite + TailwindCSS + @tanstack/react-query
- **Base de datos**: `electricista.db` (SQLite, excluido del repo)
- **Proceso**: pm2, nombre del proceso: `electricista`

## Infraestructura
- **Servidor de producción**: `192.168.3.151` (otro equipo en la red local, no el Mac)
- **Ruta remota**: `/opt/clinica-dental`
- **Puerto**: `3001`
- **SSH key**: `~/.ssh/trazabilidad_minipc_ed25519`
- **Deploy**: `./deploy.sh` — rsync + `pm2 restart all`
- **GitHub**: `https://github.com/fjferran/wasap.git` (cuenta `fjferran`)

## Estructura de ficheros clave

```
clinica-dental/
├── deploy.sh                          # rsync + restart en servidor
├── server/
│   ├── index.js                       # Express app, sirve también el client/dist
│   ├── db.js                          # Schema SQLite, migraciones automáticas
│   ├── routes/
│   │   ├── webhook.js                 # Recibe mensajes de Twilio → llama a openai.js
│   │   ├── turnos.js                  # CRUD trabajos, marca completado/cancelado, envía encuesta
│   │   ├── configuracion.js           # Guarda/lee config del negocio
│   │   └── mensajes.js                # Historial de mensajes
│   ├── services/
│   │   ├── openai.js                  # Prompt, herramientas IA, lógica principal
│   │   └── twilio.js                  # TwiML, notificación emergencia, encuesta satisfacción
│   └── utils/
│       └── fechas.js                  # generarHorariosDelDia() → 9:00–17:00 cada hora
└── client/src/
    ├── components/
    │   ├── TabTurnos.jsx              # Vista principal trabajos (lista + calendario + filtros)
    │   ├── CalendarioTurnos.jsx       # Calendario mensual con panel detalle
    │   ├── ListaTurnos.jsx            # Lista de trabajos con filtro
    │   └── TabConfiguracion.jsx       # Formulario configuración negocio
    └── lib/api.js                     # Llamadas fetch al backend
```

## Base de datos — tabla `turnos`

| columna | tipo | notas |
|---|---|---|
| id | INTEGER PK | auto |
| numero_telefono | TEXT | teléfono WhatsApp del cliente |
| nombre_paciente | TEXT | nombre del cliente |
| fecha_turno | TEXT | ISO datetime, NULL para emergencias |
| tipo_turno | TEXT | tipo de trabajo |
| estado | TEXT | `pendiente` / `confirmado` / `completado` / `cancelado` |
| prioridad | TEXT | `normal` / `urgente` |
| notas | TEXT | descripción + dirección concatenadas |
| feedback | TEXT | `👍 Satisfecho` / `👎 Insatisfecho: ...` |
| creado_en | TEXT | datetime auto |
| actualizado_en | TEXT | datetime auto |

Tabla de configuración: `configuracion_negocio` (columnas: `nombre_negocio`, `sobre_negocio`, etc.)

## Herramientas IA (function calling en openai.js)

| herramienta | cuándo se usa |
|---|---|
| `registrar_emergencia` | cliente reporta urgencia, notifica al electricista por WA |
| `consultar_disponibilidad` | cliente propone fecha/hora → verifica huecos libres, devuelve `hora_solicitada_disponible` y `alternativas_cercanas` si está ocupada |
| `agendar_trabajo` | tras confirmar datos y hueco libre |
| `ver_solicitudes_cliente` | cliente pregunta por sus citas |
| `cancelar_solicitud` | cliente cancela por ID |
| `registrar_feedback` | cliente responde SI/NO a la encuesta post-trabajo |

## Flujo WhatsApp resumido

1. Twilio POST → `webhook.js` extrae `Body` y `From` (teléfono real)
2. `procesarMensajeConIA(mensaje, historial, config, numeroTelefono)` en `openai.js`
3. El teléfono se inyecta automáticamente en todas las herramientas (`argumentos.numero_telefono = numeroTelefono`) — la IA nunca lo pide al cliente
4. Si la IA llama a tools → se ejecutan → resultado vuelve a OpenAI → respuesta final
5. Respuesta en formato TwiML

## Reglas críticas del prompt

- **Regla 0**: Siempre incluir `📱 <telefono>` en todos los resúmenes
- **Regla 0b**: Una sola pregunta por mensaje
- **Regla 3b**: Siempre llamar a `consultar_disponibilidad` cuando el cliente propone fecha/hora; si está ocupado, ofrecer alternativas cercanas antes de continuar
- **Regla 5**: Encuesta responde con SI/NO (no 1/2); no mostrar menú tras la encuesta
- Confirmación final (cliente dice Sí/No) antes de registrar emergencias y citas

## Comandos habituales

```bash
# Deploy completo (build ya hecho, solo cambia server)
./deploy.sh

# Si se cambia código cliente, primero build:
cd client && npm run build && cd .. && ./deploy.sh

# Logs del servidor
ssh -i ~/.ssh/trazabilidad_minipc_ed25519 root@192.168.3.151 "pm2 logs electricista --lines 50"

# Commit y push
git add -p && git commit -m "mensaje" && git push
```

## Comportamiento del calendario (CalendarioTurnos.jsx)

- Las emergencias (`prioridad=urgente`) aparecen en el día de `creado_en` (no `fecha_turno`) y sin hora en el chip
- Los trabajos completados se muestran en gris
- `getFechaCalendario(turno)` → devuelve `fecha_turno` si existe, sino `creado_en`
- `sinFecha = []` — todos los turnos tienen fecha asignable

## Huecos de agenda

- 9:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00 (cada hora)
- Generados en `server/utils/fechas.js → generarHorariosDelDia()`
- Si el hueco pedido está ocupado, se devuelven hasta 3 alternativas cercanas ordenadas
