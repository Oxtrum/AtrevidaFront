'use client';

import { useEffect, useMemo, useState } from 'react';
import { CampoFecha, FormField, FormGrid, FormModal, FormSubmitError } from '@/components/AdminConfig';
import { ClienteSelect } from '@/components/AdminClientes/ClienteSelect';
import { useSugerenciasCliente } from '@/components/AdminClientes/useSugerenciasCliente';
import { CATEGORIAS_ORDEN } from '@/components/AdminReservationForm/constants';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { PhoneInput } from '@/components/PhoneInput';
import { actualizarReservaDB } from '@/lib/api/reservas';
import { getServiciosDB, type LocalRow, type ServicioRow } from '@/lib/api/servicios';
import type { ClientePG } from '@/lib/api/clientes';
import { vincularReservaCliente } from '@/lib/api/vinculo';
import { SLOT_MIN, SLOTS_POR_HORA, calcularHoraFin, getBusinessClosingTime, timeToMinutes } from '@/lib/constants/reservationForm';
import { horasFinDisponibles, horasInicioDisponibles } from '@/lib/utils/horasReserva';
import { formatPhoneForDisplay, phoneValueFrom } from '@/lib/utils/phone';
import { formatCostoServicio } from '@/lib/utils/serviceCost';
import { telefonosDistintos } from '@/lib/utils/telefonoCliente';
import type { ReservaBD } from '@/types/reserva';
import styles from './AprobarReservaModal.module.css';

interface AprobarReservaModalProps {
  /** La reserva a aprobar; null = cerrado. */
  reserva: ReservaBD | null;
  locales: LocalRow[];
  /** Sesion acotada a un local: no se puede mover la reserva a otro. */
  localBloqueado?: string;
  onClose: () => void;
  /** La reserva ya quedo agendada; recibe sus datos finales. */
  onAprobada: (reserva: ReservaBD) => void;
}

interface Borrador {
  fecha: string;
  horaDesde: string;
  horaHasta: string;
  local: string;
  telefono: string;
  telefonoE164?: string;
  notas: string;
  servicio: string;
  clienteTexto: string;
  clienteElegido: ClientePG | null;
  actualizarTelefono: boolean;
}

interface Catalogo {
  local: string;
  servicios: ServicioRow[];
  error?: string;
}

const nombreCompleto = (c: ClientePG) => `${c.nombre} ${c.apellido}`.trim();
const servicioInicial = (r: ReservaBD) => r.servicio_confirmado || r.servicio_solicitado || r.servicio || '';
const hoy = () => new Date().toLocaleDateString('en-CA');
const enUnAnio = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString('en-CA');
};

const minutosAHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function borradorDe(r: ReservaBD): Borrador {
  const phone = phoneValueFrom(r.telefono_e164 || r.numero_telefono);
  return {
    fecha: r.fecha,
    horaDesde: r.hora_desde,
    horaHasta: r.hora_hasta,
    local: r.local,
    telefono: phone.nationalNumber,
    telefonoE164: phone.e164,
    notas: r.notas ?? '',
    servicio: servicioInicial(r),
    clienteTexto: r.cliente ?? '',
    clienteElegido: null,
    actualizarTelefono: false,
  };
}

/**
 * Aprobar una solicitud: se confirman o corrigen sus datos y pasa a la agenda. Se puede cambiar cliente, sucursal,
 * dia, hora, telefono, servicio y notas. Las horas se eligen de la rejilla de 30 minutos y el dia en el calendario,
 * para no escribir una hora suelta como 12:10.
 */
export function AprobarReservaModal({ reserva, locales, localBloqueado, onClose, onAprobada }: AprobarReservaModalProps) {
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Si el cliente ya se enlazo y la aprobacion fallo (cupo), al reintentar no se vuelve a enlazar.
  const [enlazada, setEnlazada] = useState(false);

  const reservaId = reserva?.id ?? null;
  const vinculada = reserva?.cliente_id != null;
  const sugerencias = useSugerenciasCliente(reserva && !vinculada ? reserva.id : null);

  // Al abrir otra reserva se parte de sus datos.
  useEffect(() => {
    if (!reserva) {
      setBorrador(null);
      return;
    }
    setBorrador(borradorDe(reserva));
    setCatalogo(null);
    setError(null);
    setEnlazada(false);
    // Solo cambia al abrir otra reserva; editar el borrador no debe reiniciarlo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservaId]);

  // Escape cierra, salvo mientras se guarda.
  useEffect(() => {
    if (!reserva) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onClose();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [reserva, guardando, onClose]);

  // Los servicios son de cada sucursal: al cambiar de local se vuelven a pedir.
  const localElegido = borrador?.local;
  useEffect(() => {
    if (!localElegido) return;
    let activo = true;
    void getServiciosDB({ local: localElegido })
      .then((res) => {
        if (!activo) return;
        const servicios = (res.data?.servicios ?? []).filter((s) => s.activo !== false);
        setCatalogo({ local: localElegido, servicios });
        // Un servicio que esa sucursal no ofrece no puede quedar elegido.
        setBorrador((actual) => actual && !servicios.some((s) => s.nombre === actual.servicio) ? { ...actual, servicio: '' } : actual);
      })
      .catch(() => {
        if (activo) setCatalogo({ local: localElegido, servicios: [], error: 'No se pudo cargar el catálogo de servicios. Cierra el formulario y vuelve a abrirlo.' });
      });
    return () => { activo = false; };
  }, [localElegido, reservaId]);

  const catalogoListo = catalogo?.local === borrador?.local;

  const gruposServicio = useMemo(() => {
    if (!catalogo || !catalogoListo) return [];
    const categorias = new Map<string, ServicioRow[]>();
    for (const servicio of catalogo.servicios) {
      const categoria = servicio.categoria || 'Otros';
      if (!categorias.has(categoria)) categorias.set(categoria, []);
      categorias.get(categoria)!.push(servicio);
    }
    const orden = [...CATEGORIAS_ORDEN, ...Array.from(categorias.keys()).filter((c) => !(CATEGORIAS_ORDEN as readonly string[]).includes(c))];
    return orden.filter((c) => categorias.has(c)).map((c) => ({
      label: c,
      options: categorias.get(c)!.map((servicio) => ({
        value: servicio.nombre,
        label: `${servicio.nombre} — ${String(servicio.tiempo || '')} — ${formatCostoServicio(servicio)}`,
      })),
    }));
  }, [catalogo, catalogoListo]);

  const opcionesLocal = useMemo(
    () => (localBloqueado ? [{ value: localBloqueado, label: localBloqueado }] : locales.map((l) => ({ value: l.nombre, label: l.nombre }))),
    [locales, localBloqueado],
  );

  const cierre = useMemo(
    () => (borrador?.fecha ? getBusinessClosingTime(borrador.local, new Date(`${borrador.fecha}T00:00:00`)) : null),
    [borrador?.fecha, borrador?.local],
  );
  const opcionesDesde = useMemo(
    () => horasInicioDisponibles(cierre, reserva?.hora_desde).map((h) => ({ value: h, label: h })),
    [cierre, reserva?.hora_desde],
  );
  const opcionesHasta = useMemo(
    () => horasFinDisponibles(borrador?.horaDesde ?? '', cierre, reserva?.hora_hasta).map((h) => ({ value: h, label: h })),
    [borrador?.horaDesde, cierre, reserva?.hora_hasta],
  );

  if (!reserva || !borrador) return null;

  const cambiar = (cambios: Partial<Borrador>) => {
    setError(null);
    setBorrador((actual) => (actual ? { ...actual, ...cambios } : actual));
  };

  // Al mover el inicio se conserva la duracion, recortada al cierre del local.
  const cambiarInicio = (horaDesde: string) => {
    const duracion = Math.max(timeToMinutes(borrador.horaHasta) - timeToMinutes(borrador.horaDesde), SLOT_MIN);
    const fecha = new Date(`${borrador.fecha}T00:00:00`);
    const horaHasta = calcularHoraFin(horaDesde, Math.max(Math.round(duracion / SLOT_MIN), 1), borrador.local, fecha);
    cambiar({ horaDesde, horaHasta: horaHasta > horaDesde ? horaHasta : minutosAHora(timeToMinutes(horaDesde) + SLOT_MIN * SLOTS_POR_HORA) });
  };

  const ofrecerTelefono = !vinculada && borrador.clienteElegido != null
    && telefonosDistintos(borrador.clienteElegido, { telefono_e164: borrador.telefonoE164, numero_telefono: borrador.telefono });

  const aprobar = async () => {
    const servicio = catalogoListo ? catalogo?.servicios.find((s) => s.nombre === borrador.servicio) : undefined;
    if (!servicio) {
      setError('Selecciona el servicio confirmado para agendar la reserva.');
      return;
    }
    if (!vinculada && !borrador.clienteElegido) {
      setError('Elige un cliente de la lista o crea uno nuevo.');
      return;
    }
    if (!borrador.fecha || !borrador.horaDesde || !borrador.horaHasta || borrador.horaHasta <= borrador.horaDesde) {
      setError('Revisa el día y las horas: el fin debe ser después del inicio.');
      return;
    }

    const digitos = borrador.telefono.replace(/\D/g, '');
    const original = phoneValueFrom(reserva.telefono_e164 || reserva.numero_telefono);
    const telefonoCambio = digitos !== original.nationalNumber.replace(/\D/g, '') || borrador.telefonoE164 !== original.e164;
    if (telefonoCambio && digitos && !borrador.telefonoE164) {
      setError('El número no es válido para el país seleccionado.');
      return;
    }

    const mismoServicio = reserva.servicio_confirmado === servicio.nombre || (!reserva.servicio_confirmado && reserva.servicio === servicio.nombre);
    const precio = mismoServicio && reserva.precio != null
      ? reserva.precio
      : servicio.costo_variable === true ? undefined : Number(servicio.costo) || 0;
    const elegido = borrador.clienteElegido;

    setGuardando(true);
    setError(null);
    try {
      // El cliente se enlaza primero: agendar exige uno registrado.
      if (!vinculada && elegido && !enlazada) {
        await vincularReservaCliente(reserva.id, { cliente_id: elegido.id, actualizar_telefono: ofrecerTelefono && borrador.actualizarTelefono });
        setEnlazada(true);
      }

      const nombreNuevo = elegido ? nombreCompleto(elegido) : '';
      // El backend aplica horario, servicio, precio, tipo y estado AGENDADO en una sola transaccion, con el cupo.
      await actualizarReservaDB({
        id: reserva.id,
        local: reserva.local,
        ...(borrador.local !== reserva.local && { nuevo_local: borrador.local }),
        ...(elegido && nombreNuevo !== reserva.cliente && { nuevo_cliente: nombreNuevo }),
        ...(borrador.fecha !== reserva.fecha && { nueva_fecha: borrador.fecha }),
        ...(borrador.horaDesde !== reserva.hora_desde && { nueva_hora_desde: borrador.horaDesde }),
        ...(borrador.horaHasta !== reserva.hora_hasta && { nueva_hora_hasta: borrador.horaHasta }),
        ...(telefonoCambio && digitos && { nuevo_numero_telefono: digitos, nuevo_telefono_e164: borrador.telefonoE164 }),
        ...(borrador.notas !== (reserva.notas ?? '') && { nuevas_notas: borrador.notas }),
        nuevo_estado: 'AGENDADO' as const,
        nuevo_servicio_confirmado: borrador.servicio,
        ...(precio !== undefined ? { nuevo_precio: precio } : {}),
        nuevo_tipo: servicio.tipoEspacio === 'B' ? 'B' as const : 'M' as const,
      });

      onAprobada({
        ...reserva,
        estado: 'AGENDADO',
        local: borrador.local,
        cliente: elegido ? nombreNuevo : reserva.cliente,
        cliente_id: elegido ? elegido.id : reserva.cliente_id,
        fecha: borrador.fecha,
        hora_desde: borrador.horaDesde,
        hora_hasta: borrador.horaHasta,
        numero_telefono: digitos,
        telefono_e164: borrador.telefonoE164,
        notas: borrador.notas,
        servicio_confirmado: servicio.nombre,
        precio,
        costo_variable: mismoServicio && reserva.costo_variable != null ? reserva.costo_variable : servicio.costo_variable === true,
        tipo: servicio.tipoEspacio === 'B' ? 'B' : 'M',
        notificado: false,
      });
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo agendar la reserva.';
      setError(mensaje.replace(/^capacidad de reserva no disponible:\s*/i, ''));
    } finally {
      setGuardando(false);
    }
  };

  const sinCatalogo = !catalogoListo || !!catalogo?.error || catalogo?.servicios.length === 0;

  return (
    <FormModal
      isOpen
      size="lg"
      title={`Aprobar reserva #${reserva.id}`}
      onClose={() => { if (!guardando) onClose(); }}
      onSubmit={aprobar}
      loading={guardando}
      submitDisabled={sinCatalogo}
      submitLabel={error ? 'Reintentar aprobación' : 'Aprobar y agendar'}
    >
      <p className={styles.lead}>
        Confirma los datos de la solicitud y el servicio definitivo antes de pasarla a agenda.
        {' '}Solicitado: <strong>{reserva.servicio_solicitado || reserva.servicio || 'Por definir'}</strong>
        {reserva.servicio_confirmado && <> · Confirmado previo: <strong>{reserva.servicio_confirmado}</strong></>}
      </p>

      <FormGrid>
        {vinculada ? (
          <FormField label="Cliente" htmlFor="aprobar-cliente" hint="Ya tiene un cliente registrado.">
            <input id="aprobar-cliente" value={reserva.cliente || 'Cliente sin nombre'} disabled />
          </FormField>
        ) : (
          <ClienteSelect
            id="aprobar-cliente"
            value={borrador.clienteTexto}
            onValueChange={(texto) => cambiar({ clienteTexto: texto, clienteElegido: null, actualizarTelefono: false })}
            onSelect={(cliente) => cambiar({ clienteElegido: cliente, clienteTexto: nombreCompleto(cliente), actualizarTelefono: false })}
            initialNombre={reserva.cliente}
            initialTelefono={borrador.telefono}
            sugerencias={sugerencias}
          />
        )}

        <FormField label="Local" labelId="aprobar-local-lbl">
          <CustomSelect
            value={borrador.local}
            onChange={(local) => cambiar({ local })}
            options={opcionesLocal}
            searchable={false}
            allowClear={false}
          />
        </FormField>

        <FormField label="Teléfono">
          <PhoneInput
            value={borrador.telefono}
            e164={borrador.telefonoE164}
            onChange={(phone) => cambiar({ telefono: phone.nationalNumber, telefonoE164: phone.e164, actualizarTelefono: false })}
            placeholder="77777777"
          />
        </FormField>

        <FormField label="Fecha" labelId="aprobar-fecha-lbl">
          <CampoFecha
            value={borrador.fecha}
            onChange={(fecha) => cambiar({ fecha })}
            min={reserva.fecha < hoy() ? reserva.fecha : hoy()}
            max={enUnAnio()}
          />
        </FormField>

        <FormField label="Hora inicio" labelId="aprobar-desde-lbl" error={cierre === null ? 'Ese día no hay atención.' : undefined}>
          <CustomSelect value={borrador.horaDesde} onChange={cambiarInicio} options={opcionesDesde} searchable={false} allowClear={false} />
        </FormField>

        <FormField label="Hora fin" labelId="aprobar-hasta-lbl">
          <CustomSelect value={borrador.horaHasta} onChange={(horaHasta) => cambiar({ horaHasta })} options={opcionesHasta} searchable={false} allowClear={false} />
        </FormField>

        <FormField label="Servicio definitivo" labelId="aprobar-servicio-lbl" wide error={catalogo?.error || undefined}>
          <CustomSelect
            value={borrador.servicio}
            onChange={(servicio) => cambiar({ servicio })}
            groups={gruposServicio}
            placeholder={catalogoListo ? 'Seleccionar servicio' : 'Cargando servicios...'}
            hasError={false}
          />
        </FormField>

        {ofrecerTelefono && borrador.clienteElegido && (
          <label className={styles.casilla}>
            <input type="checkbox" checked={borrador.actualizarTelefono} onChange={(e) => cambiar({ actualizarTelefono: e.target.checked })} />
            <span>
              El teléfono de la reserva ({formatPhoneForDisplay(borrador.telefonoE164, borrador.telefono)}) es distinto al de {nombreCompleto(borrador.clienteElegido)}
              {' '}({formatPhoneForDisplay(borrador.clienteElegido.telefono_e164, borrador.clienteElegido.numero_telefono) || 'sin teléfono'}).
              {' '}Reemplazar el del cliente.
            </span>
          </label>
        )}

        <FormField label="Notas" htmlFor="aprobar-notas" wide>
          <textarea
            id="aprobar-notas"
            value={borrador.notas}
            onChange={(e) => cambiar({ notas: e.target.value })}
            placeholder="Añade una observación para el equipo si hace falta."
          />
        </FormField>
      </FormGrid>

      <FormSubmitError message={error ?? undefined} />
    </FormModal>
  );
}
