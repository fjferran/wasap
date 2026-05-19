import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameDay, isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock,
  AlertTriangle, Zap, Phone, User, FileText, CalendarPlus,
  CalendarCheck, Wrench, CalendarDays,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { actualizarEstadoTurno } from '@/lib/api';
import { toast } from 'sonner';

// ── Configuración de colores por estado ──────────────────────────────────────
const ESTILOS = {
  urgente:    { pill: 'bg-red-500 text-white',   dot: 'bg-red-500',   ring: 'ring-red-300',   label: 'Emergencia' },
  pendiente:  { pill: 'bg-amber-400 text-white', dot: 'bg-amber-400', ring: 'ring-amber-200', label: 'Pendiente'  },
  confirmado: { pill: 'bg-blue-500 text-white',  dot: 'bg-blue-500',  ring: 'ring-blue-200',  label: 'Confirmado' },
  completado: { pill: 'bg-gray-400 text-white',  dot: 'bg-gray-400',  ring: 'ring-gray-200',  label: 'Completado' },
  cancelado:  { pill: 'bg-gray-300 text-gray-600', dot: 'bg-gray-400', ring: 'ring-gray-200', label: 'Cancelado' },
};

function estiloTurno(turno) {
  if (turno.prioridad === 'urgente' && turno.estado !== 'completado' && turno.estado !== 'cancelado') {
    return ESTILOS.urgente;
  }
  return ESTILOS[turno.estado] || ESTILOS.cancelado;
}

function formatHora(fechaStr) {
  try { return format(new Date(fechaStr), 'HH:mm'); } catch { return ''; }
}

function formatFechaLarga(fechaStr) {
  try { return format(new Date(fechaStr), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es }); } catch { return fechaStr; }
}

// Devuelve la fecha a usar en el calendario: fecha_turno si existe, o creado_en (para emergencias)
function getFechaCalendario(turno) {
  return turno.fecha_turno ? new Date(turno.fecha_turno) : new Date(turno.creado_en);
}

// ── Chip pequeño para las celdas del calendario ───────────────────────────────
function ChipTurno({ turno, onClick, seleccionado }) {
  const e = estiloTurno(turno);
  return (
    <button
      onClick={(ev) => { ev.stopPropagation(); onClick(turno); }}
      className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate font-medium transition-all
        ${e.pill} ${seleccionado ? `ring-2 ${e.ring} ring-offset-1` : 'hover:opacity-80'}`}
      title={`${turno.nombre_paciente || 'Sin nombre'} — ${turno.tipo_turno || ''}`}
    >
      {turno.fecha_turno && turno.prioridad !== 'urgente' && <span className="opacity-75 mr-1">{formatHora(turno.fecha_turno)}</span>}
      {turno.prioridad === 'urgente' && turno.estado !== 'completado' ? '🚨 ' : ''}
      {turno.nombre_paciente || 'Sin nombre'}
    </button>
  );
}

// ── Celda de un día ───────────────────────────────────────────────────────────
function CeldaDia({ fecha, turnos, mesActual, seleccionada, turnoSeleccionado, onSelectDia, onSelectTurno }) {
  const esMesActual = isSameMonth(fecha, mesActual);
  const esHoy = isToday(fecha);
  const turnosDia = turnos
    .filter(t => isSameDay(getFechaCalendario(t), fecha))
    .sort((a, b) => {
      if (a.prioridad === 'urgente') return -1;
      if (b.prioridad === 'urgente') return 1;
      return getFechaCalendario(a) - getFechaCalendario(b);
    });

  const MAX_VISIBLE = 3;
  const visibles = turnosDia.slice(0, MAX_VISIBLE);
  const ocultos = turnosDia.length - MAX_VISIBLE;

  return (
    <div
      onClick={() => onSelectDia(fecha)}
      className={`min-h-[90px] p-1.5 border-b border-r border-gray-100 cursor-pointer transition-colors
        ${!esMesActual ? 'bg-gray-50' : 'bg-white hover:bg-blue-50/30'}
        ${seleccionada ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}
    >
      {/* Número del día */}
      <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
        ${esHoy ? 'bg-blue-600 text-white' : esMesActual ? 'text-gray-700' : 'text-gray-300'}`}>
        {format(fecha, 'd')}
      </div>

      {/* Chips de turnos */}
      <div className="space-y-0.5">
        {visibles.map(t => (
          <ChipTurno
            key={t.id}
            turno={t}
            onClick={onSelectTurno}
            seleccionado={turnoSeleccionado?.id === t.id}
          />
        ))}
        {ocultos > 0 && (
          <p className="text-xs text-gray-400 pl-1">+{ocultos} más</p>
        )}
      </div>
    </div>
  );
}

// ── Panel detalle del día / turno seleccionado ────────────────────────────────
function PanelDetalle({ fecha, turnos, turnoSeleccionado, onSelectTurno }) {
  const queryClient = useQueryClient();

  const mutacion = useMutation({
    mutationFn: ({ id, estado }) => actualizarEstadoTurno(id, estado),
    onSuccess: (_, { estado }) => {
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      toast.success(estado === 'completado' ? 'Marcado como completado' : 'Trabajo cancelado');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const turnosDia = turnos
    .filter(t => isSameDay(getFechaCalendario(t), fecha))
    .sort((a, b) => {
      if (a.prioridad === 'urgente') return -1;
      if (b.prioridad === 'urgente') return 1;
      return getFechaCalendario(a) - getFechaCalendario(b);
    });

  const turnoActivo = turnoSeleccionado && turnosDia.find(t => t.id === turnoSeleccionado.id)
    ? turnoSeleccionado
    : turnosDia[0] || null;

  const fechaFormateada = format(fecha, "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="flex flex-col h-full">
      {/* Cabecera del panel */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={16} className="text-blue-500" />
        <h3 className="font-semibold text-gray-700 capitalize text-sm">{fechaFormateada}</h3>
        <Badge variant="secondary" className="text-xs ml-auto">{turnosDia.length} trabajo{turnosDia.length !== 1 ? 's' : ''}</Badge>
      </div>

      {turnosDia.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-8">
          <Clock size={32} className="mb-2 opacity-30" />
          <p className="text-sm">Sin trabajos este día</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
          {turnosDia.map(turno => {
            const e = estiloTurno(turno);
            const seleccionado = turnoActivo?.id === turno.id;
            const esUrgente = turno.prioridad === 'urgente';
            const esCancelado = turno.estado === 'cancelado';
            const esCompletado = turno.estado === 'completado';

            return (
              <div
                key={turno.id}
                onClick={() => onSelectTurno(turno)}
                className={`rounded-xl border-2 p-3 cursor-pointer transition-all
                  ${seleccionado ? `border-current ring-2 ${e.ring}` : 'border-gray-100 hover:border-gray-200'}
                  ${esUrgente && !esCancelado && !esCompletado ? 'bg-red-50' : esCancelado ? 'bg-gray-50 opacity-60' : esCompletado ? 'bg-gray-50' : 'bg-white'}`}
              >
                {/* Indicador de color + hora */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${e.dot}`} />
                  {turno.fecha_turno && (
                    <span className="text-xs font-bold text-gray-600">{formatHora(turno.fecha_turno)}</span>
                  )}
                  <Badge className={`text-xs ml-auto ${e.pill}`}>{e.label}</Badge>
                  <span className="text-xs text-gray-300 font-mono">#{turno.id}</span>
                </div>

                {/* Datos del turno */}
                {esUrgente && !esCancelado && !esCompletado && (
                  <div className="flex items-center gap-1 text-red-600 font-bold text-xs mb-1.5 animate-pulse">
                    <AlertTriangle size={12} /> EMERGENCIA ELÉCTRICA
                  </div>
                )}

                <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5 mb-1">
                  <User size={12} className="text-gray-400" />
                  {turno.nombre_paciente || 'Sin nombre'}
                </p>

                {turno.tipo_turno && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                    {esUrgente ? <Zap size={11} className="text-red-400" /> : <Wrench size={11} className="text-yellow-500" />}
                    {turno.tipo_turno}
                  </p>
                )}

                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Phone size={11} className="text-gray-400" />
                  {turno.numero_telefono}
                </p>

                {turno.notas && (
                  <p className={`text-xs flex items-start gap-1.5 mt-1.5 rounded p-1.5
                    ${esUrgente ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-500'}`}>
                    <FileText size={11} className="flex-shrink-0 mt-0.5" />
                    {turno.notas}
                  </p>
                )}

                {/* Fechas */}
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                  {turno.creado_en && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <CalendarPlus size={10} /> Recibido: {formatFechaLarga(turno.creado_en)}
                    </p>
                  )}
                  {esCompletado && turno.actualizado_en && (
                    <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                      <CalendarCheck size={10} /> Completado: {formatFechaLarga(turno.actualizado_en)}
                    </p>
                  )}
                </div>

                {/* Feedback */}
                {esCompletado && (
                  <div className={`mt-2 rounded px-2 py-1.5 text-xs flex items-center gap-1.5
                    ${turno.feedback
                      ? turno.feedback.startsWith('👍') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-400'}`}>
                    {turno.feedback || '⏳ Esperando valoración del cliente...'}
                  </div>
                )}

                {/* Botones de acción */}
                {!esCancelado && !esCompletado && (
                  <div className="flex gap-1.5 mt-2.5" onClick={ev => ev.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50 h-7"
                      disabled={mutacion.isPending}
                      onClick={() => mutacion.mutate({ id: turno.id, estado: 'completado' })}
                    >
                      <CheckCircle size={11} /> Completado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs gap-1 border-red-200 text-red-500 hover:bg-red-50 h-7"
                      disabled={mutacion.isPending}
                      onClick={() => mutacion.mutate({ id: turno.id, estado: 'cancelado' })}
                    >
                      <XCircle size={11} /> Cancelar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CalendarioTurnos({ turnos = [] }) {
  const [mesActual, setMesActual] = useState(new Date());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);

  // Generar semanas del mes
  const semanas = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesActual), { weekStartsOn: 1 });
    const fin = endOfWeek(endOfMonth(mesActual), { weekStartsOn: 1 });
    const dias = [];
    let dia = inicio;
    while (dia <= fin) { dias.push(dia); dia = addDays(dia, 1); }
    const semanas = [];
    for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
    return semanas;
  }, [mesActual]);

  const handleSelectDia = (fecha) => {
    setFechaSeleccionada(fecha);
    setTurnoSeleccionado(null);
  };

  const handleSelectTurno = (turno) => {
    setTurnoSeleccionado(turno);
    setFechaSeleccionada(getFechaCalendario(turno));
  };

  // Todos los turnos tienen fecha (fecha_turno o creado_en), nada queda sin asignar
  const sinFecha = [];

  // Turnos con fecha fuera del mes visible
  const fueraDelMes = turnos.filter(t => {
    if (t.estado === 'cancelado') return false;
    return !isSameMonth(getFechaCalendario(t), mesActual);
  });

  const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* ── Calendario ── */}
      <div className="flex-1 min-w-0">
        <Card>
          {/* Navegación de mes */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setMesActual(m => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={18} className="text-gray-600" />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="font-bold text-gray-800 capitalize text-base">
                {format(mesActual, "MMMM yyyy", { locale: es })}
              </h2>
              <button
                onClick={() => { setMesActual(new Date()); setFechaSeleccionada(new Date()); }}
                className="text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors"
              >
                Hoy
              </button>
            </div>

            <button
              onClick={() => setMesActual(m => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>

          {/* Cabecera días semana */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Grid de semanas */}
          <div>
            {semanas.map((semana, i) => (
              <div key={i} className="grid grid-cols-7">
                {semana.map((dia, j) => (
                  <CeldaDia
                    key={j}
                    fecha={dia}
                    turnos={turnos}
                    mesActual={mesActual}
                    seleccionada={isSameDay(dia, fechaSeleccionada)}
                    turnoSeleccionado={turnoSeleccionado}
                    onSelectDia={handleSelectDia}
                    onSelectTurno={handleSelectTurno}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            {Object.entries(ESTILOS).map(([key, e]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${e.dot}`} />
                <span className="text-xs text-gray-500">{e.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Trabajos sin fecha */}
        {sinFecha.length > 0 && (
          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                <AlertTriangle size={14} />
                Sin fecha asignada ({sinFecha.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {sinFecha.map(t => {
                  const e = estiloTurno(t);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTurnoSeleccionado(t)}
                      className={`text-xs px-2 py-1 rounded-full font-medium transition-all hover:opacity-80
                        ${e.pill} ${turnoSeleccionado?.id === t.id ? `ring-2 ${e.ring} ring-offset-1` : ''}`}
                    >
                      {t.prioridad === 'urgente' ? '🚨 ' : ''}{t.nombre_paciente || 'Sin nombre'}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trabajos con fecha fuera de este mes */}
        {fueraDelMes.length > 0 && (
          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-gray-500">
                <CalendarDays size={14} />
                Fuera de este mes ({fueraDelMes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col gap-1.5">
                {fueraDelMes.map(t => {
                  const e = estiloTurno(t);
                  const fechaCal = getFechaCalendario(t);
                  const fechaPasada = fechaCal < new Date();
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setMesActual(fechaCal);
                        setFechaSeleccionada(fechaCal);
                        setTurnoSeleccionado(t);
                      }}
                      className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80 text-left
                        ${e.pill} ${turnoSeleccionado?.id === t.id ? `ring-2 ${e.ring} ring-offset-1` : ''}`}
                    >
                      <span>{t.prioridad === 'urgente' ? '🚨' : '📅'}</span>
                      <span className="font-semibold">{t.nombre_paciente || 'Sin nombre'}</span>
                      <span className="opacity-75">—</span>
                      <span className={fechaPasada ? 'line-through opacity-60' : ''}>
                        {format(fechaCal, "d MMM yyyy", { locale: es })}
                      </span>
                      {fechaPasada && <span className="opacity-75 text-xs">(fecha pasada)</span>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Panel de detalle ── */}
      <div className="lg:w-80 xl:w-96 flex-shrink-0">
        <Card className="h-full">
          <CardContent className="p-4 h-full">
            <PanelDetalle
              fecha={fechaSeleccionada}
              turnos={turnos}
              turnoSeleccionado={turnoSeleccionado}
              onSelectTurno={handleSelectTurno}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
