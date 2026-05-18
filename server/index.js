require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Verificar que la API key de OpenAI esté configurada
if (!process.env.OPENAI_API_KEY) {
  console.error('\n❌ ERROR: La variable de entorno OPENAI_API_KEY no está configurada.');
  console.error('   Copiá .env.example a .env y agregá tu API key de OpenAI.\n');
  process.exit(1);
}

// Inicializar la base de datos (se ejecuta al importar)
const db = require('./db');

// Importar rutas
const webhookRouter = require('./routes/webhook');
const mensajesRouter = require('./routes/mensajes');
const turnosRouter = require('./routes/turnos');
const configuracionRouter = require('./routes/configuracion');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globales
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser para JSON (dashboard)
app.use(bodyParser.json());

// Body parser para form-urlencoded (Twilio envía en este formato)
app.use(bodyParser.urlencoded({ extended: false }));

// Logging de cada request
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Montar rutas de la API
app.use('/api/webhook', webhookRouter);
app.use('/api/mensajes', mensajesRouter);
app.use('/api/turnos', turnosRouter);
app.use('/api/configuracion', configuracionRouter);

// Ruta de salud para verificar que el servidor está funcionando
app.get('/api/salud', (req, res) => {
  res.json({
    estado: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// En producción, servir los archivos estáticos del build de React
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuildPath));

  // Todas las rutas no-API sirven el index.html de React
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error('[Server] Error no manejado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    detalle: process.env.NODE_ENV === 'development' ? err.message : 'Contactá al administrador',
  });
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n⚡ Electricista 24hs — Asistente IA');
  console.log('=====================================');
  console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/api/webhook/whatsapp`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configurada ✓' : 'NO CONFIGURADA ✗'}`);
  console.log('=====================================\n');
});

module.exports = app;
