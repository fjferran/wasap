// Helpers de fecha en español

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Formatea una fecha como "22 de marzo de 2026, 14:30"
function formatearFechaLarga(fecha) {
  const d = new Date(fecha);
  const dia = d.getDate();
  const mes = MESES[d.getMonth()];
  const anio = d.getFullYear();
  const horas = String(d.getHours()).padStart(2, '0');
  const minutos = String(d.getMinutes()).padStart(2, '0');
  return `${dia} de ${mes} de ${anio}, ${horas}:${minutos}`;
}

// Formatea una fecha como "22 Mar, 14:30"
function formatearFechaCorta(fecha) {
  const d = new Date(fecha);
  const dia = d.getDate();
  const mes = MESES[d.getMonth()].substring(0, 3);
  const horas = String(d.getHours()).padStart(2, '0');
  const minutos = String(d.getMinutes()).padStart(2, '0');
  return `${dia} ${mes.charAt(0).toUpperCase() + mes.slice(1)}, ${horas}:${minutos}`;
}

// Formatea solo la hora como "14:30"
function formatearHora(fecha) {
  const d = new Date(fecha);
  const horas = String(d.getHours()).padStart(2, '0');
  const minutos = String(d.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

// Devuelve la fecha en formato YYYY-MM-DD
function formatearFechaISO(fecha) {
  const d = new Date(fecha);
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// Obtiene el nombre del día de la semana en español
function obtenerDiaSemana(fecha) {
  return DIAS_SEMANA[new Date(fecha).getDay()];
}

// Genera los horarios disponibles del día (de 9:00 a 18:00, cada hora)
function generarHorariosDelDia() {
  const horarios = [];
  for (let hora = 9; hora < 18; hora++) {
    horarios.push(`${String(hora).padStart(2, '0')}:00`);
  }
  return horarios;
}

// Verifica si una fecha es en el pasado
function esFechaValida(fechaStr) {
  const fecha = new Date(fechaStr);
  return fecha > new Date();
}

module.exports = {
  formatearFechaLarga,
  formatearFechaCorta,
  formatearHora,
  formatearFechaISO,
  obtenerDiaSemana,
  generarHorariosDelDia,
  esFechaValida,
};
