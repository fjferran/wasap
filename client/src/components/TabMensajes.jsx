import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Smartphone, Bot, RefreshCw, ChevronLeft, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { obtenerMensajes } from '@/lib/api';

function formatearFecha(fechaStr) {
  try {
    return format(new Date(fechaStr), "d MMM, HH:mm", { locale: es });
  } catch {
    return fechaStr;
  }
}

function BurbujaMensaje({ mensaje }) {
  const esUsuario = mensaje.remitente === 'usuario';
  return (
    <div className={`flex gap-2 mb-3 ${esUsuario ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${
        esUsuario ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'
      }`}>
        {esUsuario ? <Smartphone size={13} /> : <Bot size={13} />}
      </div>
      <div className={`max-w-[78%]`}>
        <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          esUsuario
            ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
            : 'bg-blue-50 text-blue-900 rounded-tr-sm'
        }`}>
          {mensaje.contenido_mensaje}
        </div>
        <p className={`text-xs text-gray-400 mt-0.5 ${esUsuario ? '' : 'text-right'}`}>
          {formatearFecha(mensaje.recibido_en)}
        </p>
      </div>
    </div>
  );
}

export default function TabMensajes() {
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null);

  const { data: mensajes = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ['mensajes'],
    queryFn: obtenerMensajes,
    refetchInterval: 5000,
  });

  // Agrupar por número de teléfono
  const conversaciones = mensajes.reduce((acc, msg) => {
    const tel = msg.numero_telefono;
    if (!acc[tel]) acc[tel] = [];
    acc[tel].push(msg);
    return acc;
  }, {});

  const listaContactos = Object.entries(conversaciones)
    .map(([tel, msgs]) => ({
      telefono: tel,
      mensajes: msgs,
      ultimo: msgs[msgs.length - 1],
      total: msgs.length,
    }))
    .sort((a, b) => new Date(b.ultimo.recibido_en) - new Date(a.ultimo.recibido_en));

  const mensajesContacto = contactoSeleccionado
    ? (conversaciones[contactoSeleccionado] || [])
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: '600px' }}>
      {/* Lista de contactos */}
      <Card className={`lg:col-span-1 flex flex-col ${contactoSeleccionado ? 'hidden lg:flex' : 'flex'}`}>
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Conversaciones</CardTitle>
            <div className="flex items-center gap-2">
              {isFetching && <RefreshCw size={12} className="animate-spin text-gray-400" />}
              <Badge variant="secondary" className="text-xs">{listaContactos.length}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2" style={{ maxHeight: '560px' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <RefreshCw size={20} className="animate-spin" />
            </div>
          ) : isError ? (
            <p className="text-center text-red-400 text-sm p-4">Error al cargar mensajes</p>
          ) : listaContactos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Smartphone size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin mensajes todavía</p>
              <p className="text-xs mt-1">Los chats de WhatsApp aparecerán aquí</p>
            </div>
          ) : (
            listaContactos.map(({ telefono, ultimo, total }) => (
              <button
                key={telefono}
                onClick={() => setContactoSeleccionado(telefono)}
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors hover:bg-gray-50 border ${
                  contactoSeleccionado === telefono
                    ? 'bg-blue-50 border-blue-200'
                    : 'border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-800">{telefono}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatearFecha(ultimo.recibido_en)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {ultimo.remitente === 'usuario' ? '👤 ' : '🤖 '}
                  {ultimo.contenido_mensaje}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{total} mensajes</p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Chat de la conversación */}
      <Card className={`lg:col-span-2 flex flex-col ${contactoSeleccionado ? 'flex' : 'hidden lg:flex'}`}>
        {contactoSeleccionado ? (
          <>
            <CardHeader className="pb-3 flex-shrink-0 border-b">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden p-1 h-auto"
                  onClick={() => setContactoSeleccionado(null)}
                >
                  <ChevronLeft size={18} />
                </Button>
                <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Smartphone size={16} className="text-gray-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{contactoSeleccionado}</p>
                  <p className="text-xs text-gray-400">{mensajesContacto.length} mensajes en total</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '520px' }}>
              {mensajesContacto.map(msg => (
                <BurbujaMensaje key={msg.id} mensaje={msg} />
              ))}
            </CardContent>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center text-gray-300">
            <div className="text-center">
              <MessageSquare size={52} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-400">Selecciona una conversación</p>
              <p className="text-xs text-gray-300 mt-1">Los mensajes aparecerán aquí</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
