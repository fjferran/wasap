import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare, Calendar, Settings, Wifi, AlertTriangle,
  Users, Zap, BarChart2, Menu, X, ChevronRight, TrendingUp,
  CheckCircle, Clock, PhoneCall,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { subDays, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import TabMensajes from '@/components/TabMensajes';
import TabTurnos from '@/components/TabTurnos';
import TabClientes from '@/components/TabClientes';
import TabConfiguracion from '@/components/TabConfiguracion';
import { obtenerConfiguracion, obtenerTurnos, obtenerMensajes } from '@/lib/api';

/* ── KPI Card ─────────────────────────────────────────────────── */
function KpiCard({ titulo, valor, subtitulo, icono: Icono, color, alerta }) {
  const colores = {
    red:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'bg-red-100 text-red-600',    val: 'text-red-700' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-100 text-blue-600',  val: 'text-blue-700' },
    green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'bg-green-100 text-green-600',val: 'text-green-700' },
    amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: 'bg-amber-100 text-amber-600',val: 'text-amber-700' },
    slate:  { bg: 'bg-white',     border: 'border-slate-200',  icon: 'bg-slate-100 text-slate-600',val: 'text-slate-700' },
  };
  const c = colores[alerta ? 'red' : color] || colores.slate;

  return (
    <div className={`rounded-xl border ${c.bg} ${c.border} p-4 flex items-center gap-4 shadow-sm`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        <Icono size={20} />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold leading-none ${c.val}`}>{valor}</p>
        <p className="text-xs font-medium text-slate-500 mt-1">{titulo}</p>
        {subtitulo && <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>}
      </div>
    </div>
  );
}

/* ── Mini bar chart ───────────────────────────────────────────── */
function MiniBar({ label, valor, maximo, color }) {
  const pct = maximo > 0 ? Math.round((valor / maximo) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-400 w-8 flex-shrink-0 text-right font-medium">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-500 font-semibold w-4 text-right">{valor}</span>
    </div>
  );
}

/* ── Stats panel ─────────────────────────────────────────────── */
function PanelEstadisticas({ turnos }) {
  const hoy = new Date();
  const ultimos7 = Array.from({ length: 7 }, (_, i) => {
    const dia = subDays(hoy, 6 - i);
    const count = turnos.filter(t => isSameDay(new Date(t.creado_en), dia)).length;
    return { label: format(dia, 'EEE', { locale: es }), count, esHoy: isSameDay(dia, hoy) };
  });
  const maxDia = Math.max(...ultimos7.map(d => d.count), 1);

  const completados = turnos.filter(t => t.estado === 'completado');
  const conFeedback = completados.filter(t => t.feedback);
  const positivos = conFeedback.filter(t => t.feedback?.startsWith('👍')).length;
  const negativos = conFeedback.filter(t => t.feedback?.startsWith('👎')).length;
  const tasa = conFeedback.length > 0 ? Math.round((positivos / conFeedback.length) * 100) : null;
  const tasaColor = tasa === null ? 'text-slate-400' : tasa >= 80 ? 'text-green-600' : tasa >= 60 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={15} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Actividad — últimos 7 días</p>
        </div>
        <div className="space-y-2">
          {ultimos7.map(d => (
            <MiniBar key={d.label} label={d.label} valor={d.count} maximo={maxDia}
              color={d.esHoy ? 'bg-blue-500' : 'bg-blue-300'} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={15} className="text-slate-400" />
          <p className="text-sm font-semibold text-slate-700">Satisfacción del cliente</p>
        </div>
        {conFeedback.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-slate-300">
            <CheckCircle size={32} className="mb-2 opacity-40" />
            <p className="text-xs">Sin valoraciones todavía</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center mb-3">
              <span className={`text-4xl font-bold ${tasaColor}`}>{tasa}%</span>
              <p className="text-xs text-slate-400 mt-1">tasa de satisfacción</p>
            </div>
            <MiniBar label="👍" valor={positivos} maximo={conFeedback.length} color="bg-green-500" />
            <MiniBar label="👎" valor={negativos} maximo={conFeedback.length} color="bg-red-400" />
            <MiniBar label="⏳" valor={completados.length - conFeedback.length} maximo={Math.max(completados.length, 1)} color="bg-slate-300" />
            <p className="text-xs text-slate-400 text-right pt-1">{conFeedback.length} de {completados.length} valorados</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sidebar nav item ─────────────────────────────────────────── */
function NavItem({ icono: Icono, label, activo, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
        ${activo
          ? 'bg-white/10 text-white'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
    >
      <Icono size={18} className={activo ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'} />
      <span className="flex-1 text-left">{label}</span>
      {badge > 0 && (
        <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0
          ${activo ? 'bg-white text-slate-900' : 'bg-red-500 text-white'}`}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {activo && <ChevronRight size={14} className="text-white/50 flex-shrink-0" />}
    </button>
  );
}

/* ── Dashboard ───────────────────────────────────────────────── */
const SECCIONES = {
  turnos:        { label: 'Trabajos',      icono: Calendar },
  mensajes:      { label: 'Mensajes',      icono: MessageSquare },
  clientes:      { label: 'Clientes',      icono: Users },
  configuracion: { label: 'Configuración', icono: Settings },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [seccion, setSeccion] = useState('turnos');
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [contactoInicialMensajes, setContactoInicialMensajes] = useState(null);

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

  const emergenciasActivas = turnos.filter(t => t.prioridad === 'urgente' && !['cancelado','completado'].includes(t.estado));
  const trabajosActivos    = turnos.filter(t => t.estado !== 'cancelado' && t.prioridad !== 'urgente' && t.estado !== 'completado');
  const hoy                = new Date().toDateString();
  const trabajosHoy        = turnos.filter(t => t.fecha_turno && new Date(t.fecha_turno).toDateString() === hoy && t.estado !== 'cancelado');
  const contactosUnicos    = new Set(mensajes.map(m => m.numero_telefono)).size;
  const sinValorar         = turnos.filter(t => t.estado === 'completado' && !t.feedback).length;

  function irAlChat(telefono) {
    setContactoInicialMensajes(telefono);
    setSeccion('mensajes');
    setSidebarAbierta(false);
  }

  function navegar(s) {
    setSeccion(s);
    setSidebarAbierta(false);
  }

  const SeccionActual = SECCIONES[seccion];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">

      {/* Overlay móvil */}
      {sidebarAbierta && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarAbierta(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-slate-900 flex flex-col
        transform transition-transform duration-200
        ${sidebarAbierta ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <Zap size={18} className="text-slate-900" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate leading-tight">
              {config?.nombre_negocio || 'Electricista'}
            </p>
            <p className="text-xs text-slate-400">Panel de control</p>
          </div>
          <button className="lg:hidden ml-auto text-slate-400 hover:text-white" onClick={() => setSidebarAbierta(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Emergencia banner en sidebar */}
        {emergenciasActivas.length > 0 && (
          <div className="mx-3 mt-3 bg-red-500/20 border border-red-500/40 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400 animate-pulse flex-shrink-0" />
            <p className="text-xs text-red-300 font-semibold">
              {emergenciasActivas.length} emergencia{emergenciasActivas.length > 1 ? 's' : ''} activa{emergenciasActivas.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Gestión</p>
          <NavItem icono={Calendar}      label="Trabajos"      activo={seccion === 'turnos'}        badge={emergenciasActivas.length} onClick={() => navegar('turnos')} />
          <NavItem icono={MessageSquare} label="Mensajes"      activo={seccion === 'mensajes'}      badge={contactosUnicos}           onClick={() => navegar('mensajes')} />
          <NavItem icono={Users}         label="Clientes"      activo={seccion === 'clientes'}      badge={0}                         onClick={() => navegar('clientes')} />

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mt-5 mb-2">Sistema</p>
          <NavItem icono={Settings}      label="Configuración" activo={seccion === 'configuracion'} badge={0}                         onClick={() => navegar('configuracion')} />
        </nav>

        {/* Footer sidebar */}
        <div className="px-4 py-4 border-t border-white/10 flex-shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-400">Sistema activo</span>
            <Wifi size={11} className="text-slate-500 ml-auto" />
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors text-left"
          >
            ← Volver al inicio
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-4 sm:px-6 flex-shrink-0 shadow-sm">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setSidebarAbierta(true)}
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-800">{SeccionActual.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {emergenciasActivas.length > 0 && (
              <button onClick={() => navegar('turnos')}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors animate-pulse">
                <AlertTriangle size={12} />
                {emergenciasActivas.length} emergencia{emergenciasActivas.length > 1 ? 's' : ''}
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Online
            </div>
          </div>
        </header>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">

            {/* KPIs — solo en Trabajos y Mensajes */}
            {(seccion === 'turnos' || seccion === 'mensajes') && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                <KpiCard titulo="Emergencias activas" valor={emergenciasActivas.length} icono={AlertTriangle} color="amber" alerta={emergenciasActivas.length > 0} subtitulo={emergenciasActivas.length > 0 ? 'Requieren atención' : 'Sin alertas'} />
                <KpiCard titulo="Trabajos en curso"   valor={trabajosActivos.length}    icono={Clock}          color="blue"  subtitulo="Pendientes y confirmados" />
                <KpiCard titulo="Agenda de hoy"        valor={trabajosHoy.length}        icono={Calendar}       color="green" subtitulo={format(new Date(), "EEEE d 'de' MMMM", { locale: es })} />
                <KpiCard titulo="Clientes activos"     valor={contactosUnicos}           icono={PhoneCall}      color="slate" subtitulo={sinValorar > 0 ? `${sinValorar} trabajos sin valorar` : 'Todo valorado'} />
              </div>
            )}

            {/* Stats — solo en Trabajos */}
            {seccion === 'turnos' && (
              <div className="mb-5">
                <PanelEstadisticas turnos={turnos} />
              </div>
            )}

            {/* Contenido de sección */}
            {seccion === 'turnos'        && <TabTurnos onVerChat={irAlChat} />}
            {seccion === 'mensajes'      && <TabMensajes contactoInicial={contactoInicialMensajes} />}
            {seccion === 'clientes'      && <TabClientes onVerChat={irAlChat} />}
            {seccion === 'configuracion' && <TabConfiguracion />}
          </div>
        </div>
      </div>
    </div>
  );
}
