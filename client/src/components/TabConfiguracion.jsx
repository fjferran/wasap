import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, ExternalLink, Save, Settings, Zap, Building2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { obtenerConfiguracion, guardarConfiguracion } from '@/lib/api';

function CampoWebhook({ webhookUrl }) {
  const [copiado, setCopiado] = useState(false);

  const copiarAlPortapapeles = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiado(true);
      toast.success('URL copiada al portapapeles');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <p className="text-xs text-gray-500 mb-2">URL del webhook — pégala en el panel de Twilio</p>
      <div className="flex gap-2">
        <Input value={webhookUrl} readOnly className="font-mono text-xs bg-white" />
        <Button
          variant="outline"
          size="sm"
          onClick={copiarAlPortapapeles}
          className="flex-shrink-0 gap-1.5"
        >
          {copiado ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          {copiado ? 'Copiado' : 'Copiar'}
        </Button>
      </div>

      <div className="bg-blue-50 rounded-md p-3 border border-blue-100 mt-3">
        <p className="text-xs font-semibold text-blue-700 mb-1.5">Cómo configurar Twilio:</p>
        <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
          <li>Ve a <span className="font-mono bg-blue-100 px-1 rounded">Twilio Console → Messaging → WhatsApp Sandbox</span></li>
          <li>Pega la URL en el campo <span className="font-mono bg-blue-100 px-1 rounded">"When a message comes in"</span></li>
          <li>Selecciona el método <span className="font-mono bg-blue-100 px-1 rounded">HTTP POST</span> y guarda</li>
        </ol>
      </div>
    </div>
  );
}

export default function TabConfiguracion() {
  const queryClient = useQueryClient();
  const [formulario, setFormulario] = useState({
    nombre_negocio: '',
    direccion: '',
    telefono: '',
    email: '',
    horarios: '',
    servicios: '',
    sobre_negocio: '',
    telefono_notificacion: '',
    nombre_asistente: '',
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ['configuracion'],
    queryFn: obtenerConfiguracion,
  });

  useEffect(() => {
    if (config) {
      setFormulario({
        nombre_negocio: config.nombre_negocio || '',
        direccion: config.direccion || '',
        telefono: config.telefono || '',
        email: config.email || '',
        horarios: config.horarios || '',
        servicios: Array.isArray(config.servicios)
          ? config.servicios.join(', ')
          : config.servicios || '',
        sobre_negocio: config.sobre_negocio || '',
        telefono_notificacion: config.telefono_notificacion || '',
        nombre_asistente: config.nombre_asistente || '',
      });
    }
  }, [config]);

  const mutacion = useMutation({
    mutationFn: guardarConfiguracion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion'] });
      toast.success('Configuración guardada correctamente');
    },
    onError: (error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });

  const handleCambio = (campo) => (e) => {
    setFormulario(prev => ({ ...prev, [campo]: e.target.value }));
  };

  const handleGuardar = (e) => {
    e.preventDefault();
    mutacion.mutate(formulario);
  };

  const webhookUrl = `${window.location.origin.replace(':5173', ':3001')}/api/webhook/whatsapp`;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64 text-gray-400">
          <p>Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink size={16} />
            Integración con Twilio (WhatsApp)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CampoWebhook webhookUrl={webhookUrl} />
        </CardContent>
      </Card>

      <form onSubmit={handleGuardar} className="space-y-5">
        {/* Datos del negocio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 size={16} />
              Datos del Negocio
            </CardTitle>
            <CardDescription>La IA usa esta información para responder a los clientes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre_negocio">Nombre del negocio</Label>
                <Input
                  id="nombre_negocio"
                  placeholder="Ej: Electricidad Martínez"
                  value={formulario.nombre_negocio}
                  onChange={handleCambio('nombre_negocio')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefono">Teléfono de contacto</Label>
                <Input
                  id="telefono"
                  placeholder="Ej: +34 612 345 678"
                  value={formulario.telefono}
                  onChange={handleCambio('telefono')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  placeholder="Ej: Calle Mayor 12, Madrid"
                  value={formulario.direccion}
                  onChange={handleCambio('direccion')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Ej: info@tuempresa.com"
                  value={formulario.email}
                  onChange={handleCambio('email')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="horarios">Horarios de atención</Label>
              <Textarea
                id="horarios"
                placeholder="Ej: Lunes a Viernes: 8:00 a 18:00&#10;Sábados: 8:00 a 13:00&#10;Emergencias: 24/7"
                value={formulario.horarios}
                onChange={handleCambio('horarios')}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="servicios">Servicios (separados por coma)</Label>
              <Textarea
                id="servicios"
                placeholder="Ej: Emergencia eléctrica, Instalación nueva, Reparación / avería, Presupuesto / visita técnica"
                value={formulario.servicios}
                onChange={handleCambio('servicios')}
                rows={2}
              />
              <p className="text-xs text-gray-400">El asistente mostrará estos servicios numerados al inicio de cada conversación</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sobre_negocio">Descripción del negocio</Label>
              <Textarea
                id="sobre_negocio"
                placeholder="Ej: Electricistas matriculados con más de 10 años de experiencia. Trabajos garantizados."
                value={formulario.sobre_negocio}
                onChange={handleCambio('sobre_negocio')}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Asistente IA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap size={16} />
              Asistente IA
            </CardTitle>
            <CardDescription>Personaliza cómo se presenta el asistente por WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="nombre_asistente">Nombre del asistente</Label>
              <Input
                id="nombre_asistente"
                placeholder="Ej: Alex"
                value={formulario.nombre_asistente}
                onChange={handleCambio('nombre_asistente')}
                className="max-w-xs"
              />
              <p className="text-xs text-gray-400">Nombre con el que se presenta al cliente en WhatsApp</p>
            </div>
          </CardContent>
        </Card>

        {/* Notificaciones de emergencia */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <Bell size={16} />
              Notificaciones de Emergencia
            </CardTitle>
            <CardDescription>
              Cuando un cliente reporte una emergencia, el sistema enviará un WhatsApp a este número de forma inmediata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="telefono_notificacion">Tu número de WhatsApp</Label>
              <Input
                id="telefono_notificacion"
                placeholder="Ej: +34612345678"
                value={formulario.telefono_notificacion}
                onChange={handleCambio('telefono_notificacion')}
                className="max-w-xs"
              />
              <p className="text-xs text-gray-400">Incluye el prefijo del país sin espacios. Debe tener WhatsApp activo.</p>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={mutacion.isPending}
          className="gap-2"
        >
          <Save size={16} />
          {mutacion.isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </form>
    </div>
  );
}
