const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../electricista.db'));

db.pragma('journal_mode = WAL');

// Crear tabla de mensajes de WhatsApp
db.exec(`
  CREATE TABLE IF NOT EXISTS mensajes_whatsapp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_telefono TEXT NOT NULL,
    contenido_mensaje TEXT NOT NULL,
    remitente TEXT NOT NULL CHECK(remitente IN ('usuario', 'asistente')),
    tipo_mensaje TEXT NOT NULL DEFAULT 'texto',
    respuesta_ia TEXT,
    procesado INTEGER DEFAULT 0,
    recibido_en DATETIME DEFAULT (datetime('now', 'localtime'))
  )
`);

// Crear tabla de turnos
db.exec(`
  CREATE TABLE IF NOT EXISTS turnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_telefono TEXT NOT NULL,
    nombre_paciente TEXT,
    fecha_turno DATETIME,
    tipo_turno TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'confirmado', 'cancelado', 'completado')),
    prioridad TEXT DEFAULT 'normal',
    notas TEXT,
    creado_en DATETIME DEFAULT (datetime('now', 'localtime')),
    actualizado_en DATETIME DEFAULT (datetime('now', 'localtime'))
  )
`);

// Migraciones: añadir columnas nuevas si no existen (idempotente)
const migrarColumna = (tabla, columna, definicion) => {
  try {
    db.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`);
    console.log(`[DB] Migración: columna '${columna}' añadida a '${tabla}'`);
  } catch {
    // La columna ya existe, ignorar
  }
};

migrarColumna('turnos', 'prioridad', "TEXT DEFAULT 'normal'");
migrarColumna('turnos', 'feedback', 'TEXT');
migrarColumna('configuracion_negocio', 'telefono_notificacion', 'TEXT');
migrarColumna('configuracion_negocio', 'nombre_asistente', "TEXT DEFAULT 'Alex'");

// Trigger para actualizar automáticamente actualizado_en
db.exec(`
  CREATE TRIGGER IF NOT EXISTS actualizar_turno_timestamp
  AFTER UPDATE ON turnos
  BEGIN
    UPDATE turnos SET actualizado_en = datetime('now', 'localtime') WHERE id = NEW.id;
  END
`);

// Crear tabla de configuración del negocio
db.exec(`
  CREATE TABLE IF NOT EXISTS configuracion_negocio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_negocio TEXT DEFAULT 'Electricista 24hs',
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    horarios TEXT,
    servicios TEXT,
    sobre_negocio TEXT,
    webhook_url TEXT,
    telefono_notificacion TEXT,
    nombre_asistente TEXT DEFAULT 'Alex',
    creado_en DATETIME DEFAULT (datetime('now', 'localtime')),
    actualizado_en DATETIME DEFAULT (datetime('now', 'localtime'))
  )
`);

// Insertar configuración por defecto si no existe ningún registro
const configExistente = db.prepare('SELECT id FROM configuracion_negocio LIMIT 1').get();
if (!configExistente) {
  db.prepare(`
    INSERT INTO configuracion_negocio
    (nombre_negocio, direccion, telefono, email, horarios, servicios, sobre_negocio, nombre_asistente)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Electricista 24hs',
    'España',
    '',
    '',
    'Lunes a Viernes: 8:00 a 18:00\nSábados: 8:00 a 13:00\nEmergencias: 24/7',
    JSON.stringify(['Emergencia eléctrica', 'Instalación nueva', 'Reparación / avería', 'Presupuesto / visita técnica']),
    'Servicio de electricidad con más de 10 años de experiencia. Atendemos emergencias las 24 horas. Trabajos garantizados y matriculados.',
    'Alex'
  );
  console.log('[DB] Configuración inicial insertada correctamente');
}

console.log('[DB] Base de datos inicializada correctamente');

module.exports = db;
