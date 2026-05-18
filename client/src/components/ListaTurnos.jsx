import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Phone, User, Clock, FileText, Zap, Wrench, AlertTriangle, CheckCircle, XCircle, CalendarPlus, CalendarCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { actualizarEstadoTurno } from '@/lib/api';
import { toast } from 'sonner';

const CONFIG_ESTADO = {
  confirmado: { variant: 'success', label: 'Confirmado', emoji: '✅' },
  pendiente:  { variant: 'warning', label: 'Pendiente',  emoji: '⏳' },
  cancelado:  { variant: 'error',   label: 'Cancelado',  emoji: '❌' },
  completado: { variant: 'info',    label: 'Completado', emoji: '🔵' },
};

function formatearFechaLarga(fechaStr) {
  try {
    return format(new Date(fechaStr), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  } catch {
    return fechaStr;
  }
}

function TarjetaTurno({ turno }) {
  const queryClient = useQueryClient();
  const estado = CONFIG_ESTADO[turno.estado] || { variant: 'secondary', label: turno.estado, emoji: '❓' };
  const esUrgente = turno.prioridad === 'urgente';
  const esCancelado = turno.estado === 'cancelado';
  const esCompletado = turno.estado === 'completado';

  const mutacion = useMutation({
    mutationFn: ({ id, estado }) => actualizarEstadoTurno(id, estado),
    onSuccess: (_, { estado }) => {
      queryClient.invalidateQueries({ queryKey: ['turnos'] });
      toast.success(estado === 'completado' ? 'Trabajo marcado como completado' : 'Trabajo cancelado');
    },
    onError: () => toast.error('Error al actualizar el estado'),
  });

  return (
    <Card className={`mb-3 transition-all hover:shadow-md ${
      esUrgente && !esCancelado ? 'border-red-400 border-2 bg-red-50' :
      esCancelado ? 'opacity-50 bg-gray-50' :
      esCompletado ? 'opacity-70 bg-green-50 border-green-200' : ''
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {esUrgente && !esCancelado && (
              <div className="flex items-center gap-1.5 mb-2 text-red-600 font-bold text-sm animate-pulse">
                <AlertTriangle size={16} />
                EMERGENCIA ELÉCTRICA — ATENCIÓN INMEDIATA
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-semibold text-gray-800 flex items-center gap-1">
                <User size={14} className="text-gray-400 flex-shrink-0" />
                {turno.nombre_paciente || 'Sin nombre'}
              </span>
              <Badge variant={estado.variant} className="text-xs">
                {estado.emoji} {estado.label}
              </Badge>
              <span className="text-xs text-gray-300 font-mono ml-auto">#{turno.id}</span>
            </div>

            {turno.fecha_turno && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                <Clock size={13} className="text-blue-400 flex-shrink-0" />
                {formatearFechaLarga(turno.fecha_turno)}
              </p>
            )}

            {turno.tipo_turno && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mb-1.5">
                {esUrgente
                  ? <Zap size={13} className="text-red-400 flex-shrink-0" />
                  : <Wrench size={13} className="text-yellow-500 flex-shrink-0" />
                }
                {turno.tipo_turno}
              </p>
            )}

            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Phone size={13} className="text-gray-400 flex-shrink-0" />
              {turno.numero_telefono}
            </p>

            {turno.notas && (
              <p className={`text-sm flex items-start gap-1.5 mt-2 rounded-md p-2 ${
                esUrgente ? 'bg-red-100 text-red-800' : 'bg-gray-50 text-gray-500'
              }`}>
                <FileText size={13} className="flex-shrink-0 mt-0.5" />
                {turno.notas}
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t border-gray-100">
              {turno.creado_en && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <CalendarPlus size={11} />
                  Recibido: {formatearFechaLarga(turno.creado_en)}
                </span>
              )}
              {esCompletado && turno.actualizado_en && (
                <span className="text-xs text-green-600 flex items-center gap-1 font-medium">
                  <CalendarCheck size={11} />
                  Completado: {formatearFechaLarga(turno.actualizado_en)}
                </span>
              )}
            </div>

            {esCompletado && (
              <div className={`mt-2 rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${
                turno.feedback
                  ? turno.feedback.startsWith('👍')
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-gray-50 border border-gray-200 text-gray-400'
              }`}>
                {turno.feedback ? (
                  <>
                    <span className="text-base">{turno.feedback.startsWith('👍') ? '👍' : '👎'}</span>
                    <span className="font-medium">{turno.feedback}</span>
                  </>
                ) : (
                  <>
                    <span className="text-base">⏳</span>
                    <span>Esperando valoración del cliente...</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Botones de acción rápida */}
          {!esCancelado && !esCompletado && (
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50 h-8 px-2.5"
                disabled={mutacion.isPending}
                onClick={() => mutacion.mutate({ id: turno.id, estado: 'completado' })}
              >
                <CheckCircle size={13} />
                Completado
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 border-red-200 text-red-500 hover:bg-red-50 h-8 px-2.5"
                disabled={mutacion.isPending}
                onClick={() => mutacion.mutate({ id: turno.id, estado: 'cancelado' })}
              >
                <XCircle size={13} />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ListaTurnos({ turnos = [], isLoading = false }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>Cargando trabajos...</p>
      </div>
    );
  }

  if (turnos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <Wrench size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin trabajos</p>
          <p className="text-sm mt-1">Los trabajos solicitados aparecerán aquí</p>
        </div>
      </div>
    );
  }

  const urgentes = turnos.filter(t => t.prioridad === 'urgente' && t.estado !== 'cancelado' && t.estado !== 'completado');
  const urgentesIds = new Set(urgentes.map(t => t.id));
  const normales = turnos.filter(t => !urgentesIds.has(t.id));

  return (
    <div className="overflow-y-auto pr-1" style={{ maxHeight: '600px' }}>
      {urgentes.length > 0 && (
        <div className="mb-3 p-2 bg-red-100 rounded-lg border border-red-200">
          <p className="text-xs font-bold text-red-600 px-1 pb-1 flex items-center gap-1">
            <AlertTriangle size={12} />
            {urgentes.length} EMERGENCIA{urgentes.length > 1 ? 'S' : ''} ACTIVA{urgentes.length > 1 ? 'S' : ''}
          </p>
          {urgentes.map(turno => <TarjetaTurno key={turno.id} turno={turno} />)}
        </div>
      )}
      {normales.map(turno => <TarjetaTurno key={turno.id} turno={turno} />)}
    </div>
  );
}

export { TarjetaTurno, CONFIG_ESTADO };
