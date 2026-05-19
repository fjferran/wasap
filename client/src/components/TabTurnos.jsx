import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { List, CalendarDays, RefreshCw, AlertTriangle, Clock, CheckCircle, XCircle, Wrench, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CalendarioTurnos from './CalendarioTurnos';
import ListaTurnos from './ListaTurnos';
import { obtenerTurnos } from '@/lib/api';

const FILTROS = [
  { key: 'todos',      label: 'Todos',       icono: <List size={13} />,          color: 'bg-gray-600' },
  { key: 'urgente',    label: 'Urgentes',    icono: <AlertTriangle size={13} />, color: 'bg-red-600' },
  { key: 'pendiente',  label: 'Pendientes',  icono: <Clock size={13} />,         color: 'bg-yellow-500' },
  { key: 'confirmado', label: 'Confirmados', icono: <CheckCircle size={13} />,   color: 'bg-blue-600' },
  { key: 'completado',  label: 'Completados',       icono: <CheckCircle size={13} />, color: 'bg-green-600' },
  { key: 'valoracion', label: 'Espera valoración', icono: <Star size={13} />,       color: 'bg-orange-500' },
  { key: 'cancelado',  label: 'Cancelados',        icono: <XCircle size={13} />,    color: 'bg-gray-400' },
];

export default function TabTurnos() {
  const [vista, setVista] = useState('calendario');
  const [filtro, setFiltro] = useState('todos');

  const { data: turnos = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ['turnos'],
    queryFn: obtenerTurnos,
    refetchInterval: 5000,
  });

  const conteos = {
    todos:      turnos.length,
    urgente:    turnos.filter(t => t.prioridad === 'urgente' && t.estado !== 'cancelado' && t.estado !== 'completado').length,
    pendiente:  turnos.filter(t => t.estado === 'pendiente').length,
    confirmado: turnos.filter(t => t.estado === 'confirmado' && t.prioridad !== 'urgente').length,
    completado:  turnos.filter(t => t.estado === 'completado').length,
    valoracion:  turnos.filter(t => t.estado === 'completado' && !t.feedback).length,
    cancelado:   turnos.filter(t => t.estado === 'cancelado').length,
  };

  const turnosFiltrados = (() => {
    if (filtro === 'todos')      return turnos;
    if (filtro === 'urgente')    return turnos.filter(t => t.prioridad === 'urgente' && t.estado !== 'cancelado' && t.estado !== 'completado');
    if (filtro === 'valoracion') return turnos.filter(t => t.estado === 'completado' && !t.feedback);
    return turnos.filter(t => t.estado === filtro);
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">Gestión de Trabajos</CardTitle>
              {isFetching && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <RefreshCw size={12} className="animate-spin" />
                  Actualizando...
                </span>
              )}
            </div>

            <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setVista('lista')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors
                  ${vista === 'lista' ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List size={15} />
                Lista
              </button>
              <button
                onClick={() => setVista('calendario')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200
                  ${vista === 'calendario' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-blue-50'}`}
              >
                <CalendarDays size={15} />
                Calendario
              </button>
            </div>
          </div>

          {vista === 'lista' && (
            <div className="flex flex-wrap gap-2 mt-3">
              {FILTROS.map(f => {
                const activo = filtro === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFiltro(f.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      activo ? `${f.color} text-white shadow-sm` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.icono}
                    {f.label}
                    <span className={`rounded-full px-1.5 text-xs font-bold ${
                      activo ? 'bg-white/25 text-white' : 'bg-white text-gray-500'
                    }`}>
                      {conteos[f.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardHeader>
      </Card>

      {isError ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64 text-red-400">
            <p>Error al cargar los trabajos. Verifica que el servidor esté funcionando.</p>
          </CardContent>
        </Card>
      ) : vista === 'calendario' ? (
        <CalendarioTurnos turnos={turnos} />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <ListaTurnos turnos={turnosFiltrados} isLoading={isLoading} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
