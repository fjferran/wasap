import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Calendar, Settings, ChevronLeft, Wifi, AlertTriangle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import TabMensajes from '@/components/TabMensajes';
import TabTurnos from '@/components/TabTurnos';
import TabConfiguracion from '@/components/TabConfiguracion';
import { obtenerConfiguracion, obtenerTurnos, obtenerMensajes } from '@/lib/api';

function BannerEmergencia({ emergencias }) {
  if (emergencias.length === 0) return null;
  return (
    <div className="bg-red-600 text-white px-4 py-2.5 flex items-center gap-3">
      <AlertTriangle size={18} className="flex-shrink-0 animate-bounce" />
      <p className="font-bold text-sm">
        {emergencias.length === 1
          ? `EMERGENCIA ACTIVA: ${emergencias[0].nombre_paciente || 'Cliente'} — ${emergencias[0].notas || 'Sin descripción'}`
          : `${emergencias.length} EMERGENCIAS ACTIVAS — Requieren atención inmediata`}
      </p>
    </div>
  );
}

function TarjetaStat({ titulo, valor, icono, alerta }) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm ${alerta ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
      <span className="text-2xl">{icono}</span>
      <div>
        <p className={`text-2xl font-bold ${alerta ? 'text-red-600' : 'text-gray-900'}`}>{valor}</p>
        <p className="text-xs text-gray-500">{titulo}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: config } = useQuery({
    queryKey: ['configuracion'],
    queryFn: obtenerConfiguracion,
    staleTime: 60000,
  });

  const { data: turnos = [] } = useQuery({
    queryKey: ['turnos'],
    queryFn: obtenerTurnos,
    refetchInterval: 5000,
  });

  const { data: mensajes = [] } = useQuery({
    queryKey: ['mensajes'],
    queryFn: obtenerMensajes,
    refetchInterval: 5000,
  });

  const emergenciasActivas = turnos.filter(t => t.prioridad === 'urgente' && t.estado !== 'cancelado' && t.estado !== 'completado');
  const trabajosActivos = turnos.filter(t => t.estado !== 'cancelado' && t.prioridad !== 'urgente');
  const hoy = new Date().toDateString();
  const trabajosHoy = turnos.filter(t => t.fecha_turno && new Date(t.fecha_turno).toDateString() === hoy && t.estado !== 'cancelado');
  const contactosUnicos = new Set(mensajes.map(m => m.numero_telefono)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      <BannerEmergencia emergencias={emergenciasActivas} />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h1 className="font-bold text-gray-900 text-sm leading-tight">
                  {config?.nombre_negocio || 'Electricista'}
                </h1>
                <p className="text-xs text-gray-500">Panel de Control</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {emergenciasActivas.length > 0 && (
                <Badge className="bg-red-600 text-white gap-1 animate-pulse">
                  <AlertTriangle size={11} />
                  {emergenciasActivas.length} emergencia{emergenciasActivas.length > 1 ? 's' : ''}
                </Badge>
              )}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-full px-3 py-1.5">
                <Wifi size={12} />
                Sistema activo
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-1.5 text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Inicio</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <TarjetaStat titulo="Emergencias activas" valor={emergenciasActivas.length} icono="🚨" alerta={emergenciasActivas.length > 0} />
          <TarjetaStat titulo="Trabajos activos" valor={trabajosActivos.length} icono="🔧" />
          <TarjetaStat titulo="Trabajos hoy" valor={trabajosHoy.length} icono="📅" />
          <TarjetaStat titulo="Clientes en chat" valor={contactosUnicos} icono="💬" />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Tabs defaultValue="turnos">
          <TabsList className="mb-6 bg-white border border-gray-200 shadow-sm h-auto p-1 gap-1">
            <TabsTrigger
              value="turnos"
              className="flex items-center gap-2 px-4 py-2 text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Calendar size={15} />
              <span>Trabajos</span>
              {emergenciasActivas.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {emergenciasActivas.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="mensajes"
              className="flex items-center gap-2 px-4 py-2 text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <MessageSquare size={15} />
              <span>Mensajes</span>
              {contactosUnicos > 0 && (
                <span className="bg-gray-200 text-gray-600 text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {contactosUnicos}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="configuracion"
              className="flex items-center gap-2 px-4 py-2 text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <Settings size={15} />
              <span>Configuración</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="turnos">
            <TabTurnos />
          </TabsContent>
          <TabsContent value="mensajes">
            <TabMensajes />
          </TabsContent>
          <TabsContent value="configuracion">
            <TabConfiguracion />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
