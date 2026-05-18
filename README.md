# ⚡ Electricista 24hs — Sistema de Turnos con WhatsApp + IA

Sistema completo de gestión de turnos para servicios de electricidad y urgencias. Incluye un agente de IA (Alex) que actúa como asistente virtual por WhatsApp (vía Twilio) y un dashboard web para administrar todo.

## Stack tecnológico

- **Backend**: Node.js + Express
- **Base de datos**: SQLite (via better-sqlite3) — autocontenida, sin servicios externos
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **WhatsApp**: Twilio (webhook)
- **IA**: OpenAI GPT-4o

---

## Instalación

### 1. Clonar o descargar el proyecto

```bash
cd clinica-dental
```

### 2. Instalar dependencias

```bash
npm run setup
```

Esto instala las dependencias del backend y del frontend en un solo comando.

---

## Configuración

### 3. Configurar la API key de OpenAI

Copiá el archivo de ejemplo y completalo con tu API key:

```bash
cp .env.example .env
```

Editá `.env` y reemplazá `tu_api_key_aqui` con tu API key real de OpenAI:

```
OPENAI_API_KEY=sk-proj-...
PORT=3001
```

Podés obtener tu API key en: https://platform.openai.com/api-keys

### 4. Configurar Twilio (para WhatsApp real)

1. Creá una cuenta en [Twilio](https://www.twilio.com)
2. Ir a **Twilio Console → Messaging → WhatsApp Sandbox**
3. Configurá el webhook (ver sección "Webhook" en el dashboard)
4. En `"When a message comes in"`, pegá tu URL pública del webhook
5. Seleccioná **HTTP POST** y guardá

> **Nota**: Para desarrollo local necesitás exponer tu servidor con [ngrok](https://ngrok.com):
> ```bash
> ngrok http 3001
> ```
> Luego usá la URL de ngrok como webhook en Twilio.

---

## Levantar el proyecto en desarrollo

```bash
npm run dev
```

Esto levanta simultáneamente:
- **Backend** en `http://localhost:3001`
- **Frontend** en `http://localhost:5173`

Abrí tu navegador en `http://localhost:5173`

---

## Build para producción

### 1. Compilar el frontend

```bash
npm run build
```

Esto genera los archivos estáticos en `client/dist/`.

### 2. Iniciar el servidor en producción

```bash
NODE_ENV=production npm start
```

El servidor Express sirve tanto la API como los archivos estáticos del frontend en el mismo puerto (`3001`).

---

## Estructura del proyecto

```
clinica-dental/
├── server/
│   ├── index.js              ← Express server principal
│   ├── db.js                 ← Inicialización SQLite + esquema
│   ├── routes/
│   │   ├── webhook.js        ← Endpoint Twilio WhatsApp
│   │   ├── mensajes.js       ← API REST mensajes
│   │   ├── turnos.js         ← API REST turnos
│   │   └── configuracion.js  ← API REST config clínica
│   ├── services/
│   │   ├── openai.js         ← Lógica del agente IA (Sarah)
│   │   └── twilio.js         ← Formateo respuestas TwiML
│   └── utils/
│       └── fechas.js         ← Helpers de fecha en español
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Landing.jsx   ← Página de inicio
│   │   │   └── Dashboard.jsx ← Panel de administración
│   │   ├── components/
│   │   │   ├── TabMensajes.jsx
│   │   │   ├── TabTurnos.jsx
│   │   │   ├── TabConfiguracion.jsx
│   │   │   ├── CalendarioTurnos.jsx
│   │   │   └── ListaTurnos.jsx
│   │   └── lib/
│   │       └── api.js        ← Funciones fetch al backend
│   └── index.html
├── .env.example
├── package.json
└── README.md
```

---

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/webhook/whatsapp` | Webhook de Twilio |
| GET | `/api/mensajes` | Últimos 50 mensajes |
| GET | `/api/turnos` | Todos los turnos |
| GET | `/api/turnos/:fecha` | Turnos de una fecha (YYYY-MM-DD) |
| GET | `/api/configuracion` | Config de la clínica |
| PUT | `/api/configuracion` | Actualizar config |
| GET | `/api/salud` | Health check |

---

## Capacidades del agente IA (Alex)

Alex puede:
- **Consultar disponibilidad** para una fecha específica
- **Agendar turnos** recopilando nombre, fecha/hora y tipo de consulta
- **Ver turnos del paciente** por número de teléfono
- **Cancelar turnos** por ID
- **Reprogramar turnos** a una nueva fecha

Los horarios disponibles son de **9:00 a 18:00 hs**, con turnos cada 30 minutos.

---

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | API key de OpenAI | ✅ Sí |
| `PORT` | Puerto del servidor (default: 3001) | No |
