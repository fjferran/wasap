// Funciones para comunicarse con el backend

const BASE_URL = '/api';

async function manejarRespuesta(res) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || `Error ${res.status}`);
  }
  return res.json();
}

// --- Mensajes ---

export async function obtenerMensajes() {
  const res = await fetch(`${BASE_URL}/mensajes`);
  return manejarRespuesta(res);
}

// --- Turnos ---

export async function obtenerTurnos() {
  const res = await fetch(`${BASE_URL}/turnos`);
  return manejarRespuesta(res);
}

export async function obtenerTurnosPorFecha(fecha) {
  const res = await fetch(`${BASE_URL}/turnos/${fecha}`);
  return manejarRespuesta(res);
}

export async function actualizarEstadoTurno(id, estado) {
  const res = await fetch(`${BASE_URL}/turnos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
  return manejarRespuesta(res);
}

// --- Configuración ---

export async function obtenerConfiguracion() {
  const res = await fetch(`${BASE_URL}/configuracion`);
  return manejarRespuesta(res);
}

export async function guardarConfiguracion(datos) {
  const res = await fetch(`${BASE_URL}/configuracion`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  return manejarRespuesta(res);
}
