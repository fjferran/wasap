import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Calendar, Bot, ChevronRight, Clock, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

function useScrollAnimation() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function HeroSection({ onIrDashboard }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-yellow-50 to-amber-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-yellow-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Contenido izquierdo */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Zap size={14} />
              Asistente IA disponible 24/7
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Tu electricista,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-500">
                siempre disponible
              </span>
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
              Alex, tu asistente virtual con IA, atiende a tus clientes por WhatsApp
              las 24 horas. Gestiona trabajos, detecta emergencias y agenda visitas
              de forma automática e inteligente.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={onIrDashboard}
                className="gap-2 text-base px-8 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg shadow-yellow-200"
              >
                Ir al Panel de Control
                <ChevronRight size={18} />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 border-gray-300">
                <MessageCircle size={18} className="text-green-500" />
                Ver Demo
              </Button>
            </div>

            <div className="flex gap-8 mt-10 pt-10 border-t border-gray-100">
              {[
                { valor: '24/7', label: 'Disponibilidad' },
                { valor: '<2s', label: 'Tiempo de respuesta' },
                { valor: '100%', label: 'Automatizado' },
              ].map(({ valor, label }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-gray-900">{valor}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mockup de chat */}
          <div className="relative animate-fade-in hidden lg:block">
            <div className="relative bg-white rounded-3xl shadow-2xl shadow-yellow-100 p-6 border border-gray-100">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Electricista 24hs</p>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                    Alex IA · En línea
                  </p>
                </div>
              </div>

              <div className="py-4 space-y-3">
                {[
                  { tipo: 'bot',     texto: '¡Hola! Soy Alex ⚡\n1. Emergencia eléctrica\n2. Instalación nueva\n3. Reparación / avería\n4. Presupuesto\n5. Otro' },
                  { tipo: 'usuario', texto: '3' },
                  { tipo: 'bot',     texto: '¿Cuál es tu nombre, dirección y qué avería tienes?' },
                  { tipo: 'usuario', texto: 'Carlos, Calle Mayor 5. No hay luz en el salón.' },
                  { tipo: 'bot',     texto: '✅ Anotado Carlos. Te agendamos una visita para mañana. ¿A qué hora te viene bien?' },
                ].map((msg, i) => (
                  <div key={i} className={`flex ${msg.tipo === 'usuario' ? '' : 'flex-row-reverse'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                      msg.tipo === 'usuario'
                        ? 'bg-gray-100 text-gray-700 rounded-tl-sm'
                        : 'bg-yellow-500 text-white rounded-tr-sm'
                    }`}>
                      {msg.texto}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <div className="flex-1 bg-gray-100 rounded-full px-3 py-2 text-xs text-gray-400">
                  Escribe tu mensaje...
                </div>
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">→</span>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-red-50 border border-red-200 rounded-2xl p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-base">🚨</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">Emergencia detectada</p>
                  <p className="text-xs text-gray-400">Electricista notificado ✓</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SeccionCaracteristicas() {
  const caracteristicas = [
    {
      emoji: '🕐',
      titulo: 'Disponible 24/7',
      descripcion: 'Alex atiende a tus clientes en cualquier momento del día, incluyendo fines de semana. Nunca más una llamada perdida.',
      color: 'bg-purple-50 border-purple-100',
      emojiColor: 'bg-purple-100',
    },
    {
      emoji: '🚨',
      titulo: 'Gestión de emergencias',
      descripcion: 'Detecta automáticamente situaciones de peligro y te notifica al instante por WhatsApp para que actúes de inmediato.',
      color: 'bg-red-50 border-red-100',
      emojiColor: 'bg-red-100',
    },
    {
      emoji: '🤖',
      titulo: 'IA Inteligente',
      descripcion: 'Impulsado por GPT-4o. Alex entiende el lenguaje natural, recuerda el contexto y da respuestas precisas a cada cliente.',
      color: 'bg-yellow-50 border-yellow-100',
      emojiColor: 'bg-yellow-100',
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Todo lo que necesitas para tu negocio
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Un sistema completo que trabaja mientras tú atiendes a tus clientes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {caracteristicas.map((c, i) => (
            <div
              key={c.titulo}
              className={`animate-on-scroll rounded-2xl border p-8 ${c.color} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className={`w-14 h-14 ${c.emojiColor} rounded-2xl flex items-center justify-center text-2xl mb-5`}>
                {c.emoji}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{c.titulo}</h3>
              <p className="text-gray-600 leading-relaxed">{c.descripcion}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SeccionComoFunciona() {
  const pasos = [
    {
      titulo: 'El cliente escribe',
      descripcion: 'El cliente envía un mensaje al WhatsApp del negocio en cualquier momento del día.',
      icono: <MessageCircle size={24} className="text-yellow-600" />,
    },
    {
      titulo: 'Alex responde al instante',
      descripcion: 'La IA entiende el mensaje, detecta si es urgente y ofrece las opciones adecuadas.',
      icono: <Bot size={24} className="text-yellow-600" />,
    },
    {
      titulo: 'Trabajo confirmado',
      descripcion: 'El trabajo queda registrado automáticamente y recibes una notificación inmediata.',
      icono: <Calendar size={24} className="text-yellow-600" />,
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">¿Cómo funciona?</h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            En tres simples pasos, tus clientes tienen su trabajo confirmado
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-yellow-200 to-yellow-200" />
          {pasos.map((paso, i) => (
            <div key={paso.titulo} className="animate-on-scroll text-center" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="w-20 h-20 bg-white rounded-full shadow-lg shadow-yellow-100 flex items-center justify-center border-2 border-yellow-100">
                  {paso.icono}
                </div>
                <span className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-500 text-white rounded-full text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">{paso.titulo}</h3>
              <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{paso.descripcion}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ onIrDashboard }) {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-white font-semibold">Electricista 24hs</p>
              <p className="text-sm">Asistente IA para WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onIrDashboard}
            className="text-yellow-400 hover:text-yellow-300 transition-colors text-sm flex items-center gap-1"
          >
            Panel de Control
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-xs">
          <p>Sistema desarrollado con Node.js + React + GPT-4o</p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  useScrollAnimation();
  const irADashboard = () => navigate('/dashboard');

  return (
    <div className="min-h-screen">
      <HeroSection onIrDashboard={irADashboard} />
      <SeccionCaracteristicas />
      <SeccionComoFunciona />
      <Footer onIrDashboard={irADashboard} />
    </div>
  );
}
