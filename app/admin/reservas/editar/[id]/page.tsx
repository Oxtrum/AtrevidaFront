'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRef, useState, useEffect, useMemo } from 'react';
import gsap from 'gsap';
import { Save } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { actualizarReservaDB, actualizarEstadoReservaDB, getReservaByID } from '@/lib/api/reservas';
import { getServiciosDB } from '@/lib/api/servicios';
import { useReservas } from '@/lib/hooks/useReservas';
import { useLocales } from '@/lib/hooks/useLocales';
import { DiaSemana, EstadoReserva, ReservaBD, generarSemanas, getFechasDeSemana, esFechaPasada } from '@/types/reserva';
import { HORAS, DIAS_SEMANA, isSlotOutsideBusinessHours } from '@/lib/constants/reservationForm';
import { DaySelector } from '@/components/AdminReservationForm/DaySelector';
import { TimeSlotPicker } from '@/components/AdminReservationForm/TimeSlotPicker';
import { ServiceSelect } from '@/components/AdminReservationForm/ServiceSelect';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import type { SlotStatus } from '@/lib/utils/hoursAvailability';
import styles from './page.module.css';

const TRANSICIONES_VALIDAS: Record<string, EstadoReserva[]> = {
  PENDIENTE: ['PENDIENTE', 'AGENDADO', 'RECHAZADO'],
  AGENDADO: ['AGENDADO', 'COMPLETADO', 'RECHAZADO'],
  RECHAZADO: ['RECHAZADO'],
  COMPLETADO: ['COMPLETADO'],
};

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  AGENDADO: 'Agendado',
  COMPLETADO: 'Completado',
  RECHAZADO: 'Rechazado',
};

function EditarReservaContent() {
  const params = useParams();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const reservaId = params.id as string;
  const { data: reservasData, fetch: fetchReservas } = useReservas();
  const { locales } = useLocales();

  const [reserva, setReserva] = useState<ReservaBD | null>(null);

  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHoraDesde, setNuevaHoraDesde] = useState('');
  const [nuevaHoraHasta, setNuevaHoraHasta] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<EstadoReserva>('PENDIENTE');
  const [nuevasNotas, setNuevasNotas] = useState('');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoServicio, setNuevoServicio] = useState('');
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Array<{ nombre: string; categoria: string; tipoEspacio: string; costo: string; tiempo: string }>>([]);

  const semanasDisponibles = useMemo(() => generarSemanas(6), []);
  const [semanaIndex, setSemanaIndex] = useState(0);

  const semanaActual = semanasDisponibles[semanaIndex] || semanasDisponibles[0];

  const fechasSemana = useMemo(
    () => getFechasDeSemana(semanaActual.fechaInicio),
    [semanaActual.fechaInicio],
  );

  const diaActual = useMemo(() => {
    if (!nuevaFecha) return 'LUNES' as DiaSemana;
    for (const [dia, info] of fechasSemana) {
      if (info.fecha && info.fecha.toISOString().split('T')[0] === nuevaFecha) {
        return dia;
      }
    }
    return 'LUNES' as DiaSemana;
  }, [nuevaFecha, fechasSemana]);

  const diasDisponibles = useMemo(
    () =>
      DIAS_SEMANA.map(d => {
        const fechaInfo = fechasSemana?.get(d.value);
        return {
          ...d,
          esPasado: fechaInfo ? esFechaPasada(fechaInfo.fecha) : false,
          fecha: fechaInfo || null,
        };
      }),
    [fechasSemana],
  );

  const semanaOptions = useMemo(
    () => semanasDisponibles.map((s, idx) => ({
      value: String(idx),
      label: s.titulo,
    })),
    [semanasDisponibles],
  );

  const servicioGroups = useMemo(() => {
    const byCategory = new Map<string, Array<{ value: string; label: string }>>();
    for (const s of serviciosDisponibles) {
      const cat = s.categoria || 'Otros';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push({
        value: s.nombre,
        label: `${s.nombre} — ${s.tiempo || ''} — Bs ${s.costo || 0}`,
      });
    }
    if (nuevoServicio && !serviciosDisponibles.some(s => s.nombre === nuevoServicio)) {
      if (!byCategory.has('Otros')) byCategory.set('Otros', []);
      byCategory.get('Otros')!.push({ value: nuevoServicio, label: nuevoServicio });
    }
    return Array.from(byCategory.entries()).map(([label, options]) => ({ label, options }));
  }, [serviciosDisponibles, nuevoServicio]);

  const estadoOptions = useMemo(() => {
    const estadoActual = reserva?.estado || 'PENDIENTE';
    const validos = TRANSICIONES_VALIDAS[estadoActual] || [estadoActual];
    return validos.map(e => ({ value: e, label: ESTADO_LABELS[e] || e }));
  }, [reserva?.estado]);

  const hoursAvailability = useMemo(() => {
    const map = new Map<string, SlotStatus>();
    const hoy = new Date();

    const fechaSeleccionada = nuevaFecha ? new Date(`${nuevaFecha}T00:00:00`) : null;

    // 1. Marcar fuera de atención y pasados
    for (const hora of HORAS) {
      const [hh, mm] = hora.split(':').map(Number);
      const slotMin = hh * 60 + mm;
      const ahoraMin = hoy.getHours() * 60 + hoy.getMinutes();

      const fechaDiaStr = nuevaFecha;
      const hoyStr = new Date().toLocaleDateString('en-CA');

      if (reserva?.local && fechaSeleccionada && isSlotOutsideBusinessHours(reserva.local, fechaSeleccionada, hora)) {
        map.set(hora, 'closed');
      } else if (fechaDiaStr < hoyStr || (fechaDiaStr === hoyStr && slotMin < ahoraMin)) {
        map.set(hora, 'past');
      } else {
        map.set(hora, 'free');
      }
    }

    // 2. Marcar ocupados
    if (reservasData?.data?.reservas && nuevaFecha && reserva && locales.length > 0) {
      const currentLocal = locales.find((l) => l.nombre === reserva.local);
      const tipoRaw = (reserva.tipo || 'M').toLowerCase();
      const tipo = tipoRaw === 'b' || tipoRaw === 'bicicleta' ? 'B' : 'M';
      const capacidadMaxima = tipo === 'M'
        ? (currentLocal?.capacidad_mesas || 3)
        : (currentLocal?.capacidad_bicis || 2);

      // Filtrar reservas para el día y tipo, EXCLUYENDO la actual
      const reservasDelDia = reservasData.data.reservas.filter((r: ReservaBD) => {
        if (r.id === reserva.id) return false; // IGNORARSE A SÍ MISMO
        const tipoReserva = r.tipo?.toLowerCase();
        const matchesTipo = tipo.toLowerCase() === 'm' 
          ? (tipoReserva === 'm' || tipoReserva === 'mesa')
          : (tipoReserva === 'b' || tipoReserva === 'bicicleta');
        return r.fecha === nuevaFecha && matchesTipo;
      });

      const conteoPorHora = new Map<string, number>();
      for (const r of reservasDelDia) {
        const idxInicio = HORAS.indexOf(r.hora_desde);
        const idxFin = HORAS.indexOf(r.hora_hasta);
        if (idxInicio !== -1 && idxFin !== -1) {
          for (let i = idxInicio; i < idxFin; i++) {
            const h = HORAS[i];
            conteoPorHora.set(h, (conteoPorHora.get(h) || 0) + 1);
          }
        }
      }

      for (const [hora, conteo] of conteoPorHora.entries()) {
        if (conteo >= capacidadMaxima && map.get(hora) !== 'past' && map.get(hora) !== 'closed') {
          map.set(hora, 'occupied');
        }
      }
    }

    return map;
  }, [nuevaFecha, reservasData, reserva, locales]);

  useEffect(() => {
    const loadReserva = async () => {
      if (!reservaId) return;
      setInitialLoading(true);
      try {
        const response = await getReservaByID(reservaId);
        if (response.data?.reserva) {
          const found = response.data.reserva;
          setReserva(found);
          setNuevaFecha(found.fecha);
          setNuevaHoraDesde(found.hora_desde);
          setNuevaHoraHasta(found.hora_hasta);
          setNuevoEstado(found.estado || 'PENDIENTE');
          setNuevasNotas(found.notas || '');
          setNuevoPrecio(found.precio != null ? String(found.precio) : '');
          setNuevoTelefono(found.numero_telefono?.replace(/^\+591/, '') || '');
          setNuevoServicio(found.servicio || '');

          // Buscar en qué semana está la reserva
          const reservaDate = new Date(found.fecha + 'T00:00:00');
          const weekIdx = semanasDisponibles.findIndex(s => {
            const start = new Date(s.fechaInicio);
            const end = new Date(s.fechaInicio);
            end.setDate(end.getDate() + 6);
            return reservaDate >= start && reservaDate <= end;
          });
          if (weekIdx !== -1) setSemanaIndex(weekIdx);

        } else {
          setMessage({ type: 'error', text: 'Reserva no encontrada' });
        }
      } catch {
        setMessage({ type: 'error', text: 'Error al cargar reserva' });
      } finally {
        setInitialLoading(false);
      }
    };

    loadReserva();
  }, [reservaId, semanasDisponibles]);

  // FETCH servicios disponibles cuando se conoce el local
  useEffect(() => {
    if (!reserva?.local) return;
    const fetchServicios = async () => {
      try {
        const res = await getServiciosDB({ local: reserva.local }) as { data?: { servicios?: Array<{ nombre: string; categoria: string; tipoEspacio: string; costo: string; tiempo: string }> } };
        setServiciosDisponibles(res?.data?.servicios ?? []);
      } catch {
        setServiciosDisponibles([]);
      }
    };
    fetchServicios();
  }, [reserva?.local]);

  // FETCH reservas reales cuando cambia local o fecha
  useEffect(() => {
    if (reserva?.local && nuevaFecha) {
      fetchReservas({
        local: reserva.local,
        fecha_desde: nuevaFecha,
        fecha_hasta: nuevaFecha,
      });
    }
  }, [reserva?.local, nuevaFecha, fetchReservas]);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', clearProps: 'transform' },
      );
    }
  }, []);

  const handleDiaChange = (dia: DiaSemana) => {
    const fechaInfo = fechasSemana?.get(dia);
    if (fechaInfo?.fecha) {
      const fechaISO = fechaInfo.fecha.toISOString().split('T')[0];
      setNuevaFecha(fechaISO);
    }
  };

  const handleSemanaChange = (value: string) => {
    const idx = Number(value);
    setSemanaIndex(idx);
    const nuevasFechas = getFechasDeSemana(semanasDisponibles[idx].fechaInicio);
    for (const info of nuevasFechas.values()) {
      if (!esFechaPasada(info.fecha)) {
        const fechaISO = info.fecha.toISOString().split('T')[0];
        setNuevaFecha(fechaISO);
        break;
      }
    }
    setNuevaHoraDesde('');
    setNuevaHoraHasta('');
  };

  const handleSlotSelect = (desde: string, hasta: string) => {
    setNuevaHoraDesde(desde);
    setNuevaHoraHasta(hasta);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reserva) return;

    setLoading(true);
    setMessage(null);

    try {
      // PATCH /bd/reservas — solo campos que cambian. Spec localiza por id+local.
      const fechaChanged = nuevaFecha && nuevaFecha !== reserva.fecha;
      const desdeChanged = nuevaHoraDesde && nuevaHoraDesde !== reserva.hora_desde;
      const hastaChanged = nuevaHoraHasta && nuevaHoraHasta !== reserva.hora_hasta;
      const estadoActual = reserva.estado || 'PENDIENTE';
      const estadoChanged = nuevoEstado !== estadoActual;
      const notasChanged = nuevasNotas !== (reserva.notas || '');
      const precioChanged = nuevoPrecio !== (reserva.precio != null ? String(reserva.precio) : '');
      const telefonoOriginal = reserva.numero_telefono?.replace(/^\+591/, '') || '';
      const telefonoChanged = nuevoTelefono !== telefonoOriginal;
      const servicioChanged = nuevoServicio !== (reserva.servicio || '');

      const reservaChanged = fechaChanged || desdeChanged || hastaChanged || notasChanged || precioChanged || telefonoChanged || servicioChanged;

      if (!reservaChanged && !estadoChanged) {
        setMessage({ type: 'error', text: 'No hay cambios para guardar' });
        return;
      }

      // Estado first — if transition is invalid, nothing gets changed
      if (estadoChanged) {
        await actualizarEstadoReservaDB({
          id: reserva.id,
          estado: nuevoEstado,
          ...(nuevoEstado === 'AGENDADO' && {
            servicio_confirmado: reserva.servicio_confirmado || reserva.servicio,
            precio: nuevoPrecio !== '' ? Number(nuevoPrecio) : reserva.precio,
            tipo: (reserva.tipo === 'M' || reserva.tipo === 'B' ? reserva.tipo : 'M') as 'M' | 'B',
          }),
        });
      }

      if (reservaChanged) {
        await actualizarReservaDB({
          id: reserva.id,
          local: reserva.local,
          ...(fechaChanged && { nueva_fecha: nuevaFecha }),
          ...(desdeChanged && { nueva_hora_desde: nuevaHoraDesde }),
          ...(hastaChanged && { nueva_hora_hasta: nuevaHoraHasta }),
          ...(notasChanged && { nuevas_notas: nuevasNotas }),
          ...(precioChanged && nuevoPrecio !== '' && { nuevo_precio: Number(nuevoPrecio) }),
          ...(telefonoChanged && nuevoTelefono && { nuevo_numero_telefono: '+591' + nuevoTelefono.replace(/\D/g, '') }),
          ...(servicioChanged && nuevoServicio && { nuevo_servicio: nuevoServicio }),
        });
      }

      setReserva(prev => prev ? {
        ...prev,
        ...(fechaChanged && { fecha: nuevaFecha }),
        ...(desdeChanged && { hora_desde: nuevaHoraDesde }),
        ...(hastaChanged && { hora_hasta: nuevaHoraHasta }),
        ...(estadoChanged && { estado: nuevoEstado }),
        ...(notasChanged && { notas: nuevasNotas }),
        ...(precioChanged && nuevoPrecio !== '' && { precio: Number(nuevoPrecio) }),
        ...(telefonoChanged && nuevoTelefono && { numero_telefono: '+591' + nuevoTelefono.replace(/\D/g, '') }),
        ...(servicioChanged && nuevoServicio && { servicio: nuevoServicio }),
      } : prev);
      setMessage({ type: 'success', text: 'Reserva actualizada correctamente' });
      window.setTimeout(() => router.push('/admin/reservas'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al actualizar reserva' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>Cargando reserva...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!reserva) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <main className={styles.main}>
          <div className={styles.emptyState}>
            <h3>Reserva no encontrada</h3>
            <p>La reserva que buscas no existe o fue eliminada.</p>
            <button onClick={() => router.push('/admin/reservas')}>Volver</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div ref={contentRef} className={styles.content}>
      <a href="/admin/reservas" className={styles.backLink}>
        <span className={styles.backIcon}>{'<'}</span>
        Volver a Reservas
      </a>

      <div className={styles.reservaInfo}>
        <h2>Editar Reserva #{reserva.id}</h2>
        <div className='flex justify-around flex-wrap gap-4 mt-6'>

          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Cliente</span>
            <span className={styles.infoValue}>{reserva.cliente}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Servicio</span>
            <span className={styles.infoValue}>{reserva.servicio}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Local</span>
            <span className={styles.infoValue}>{reserva.local}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Estado</span>
            <span className={styles.infoValue}>{reserva.estado || 'PENDIENTE'}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.editForm}>
        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Semana</label>
            <CustomSelect
              value={String(semanaIndex)}
              onChange={handleSemanaChange}
              options={semanaOptions}
              hasError={false}
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Día</label>
            <DaySelector
              dias={diasDisponibles}
              diaActivo={diaActual}
              onChange={handleDiaChange}
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Horario</label>
            <TimeSlotPicker
              horaDesde={nuevaHoraDesde}
              horaHasta={nuevaHoraHasta}
              hoursAvailability={hoursAvailability}
              onSelect={handleSlotSelect}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Estado</label>
            <CustomSelect
              value={nuevoEstado}
              onChange={(value) => setNuevoEstado(value as EstadoReserva)}
              options={estadoOptions}
              hasError={false}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Precio (Bs)</label>
            <input
              type="number"
              value={nuevoPrecio}
              onChange={e => setNuevoPrecio(e.target.value)}
              placeholder="0"
              className={styles.inputField}
              min={0}
            />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Servicio</label>
            <ServiceSelect
              sucursal={reserva.local}
              servicio={nuevoServicio}
              groups={servicioGroups}
              hasError={false}
              onChange={(value) => {
                setNuevoServicio(value);
                const svc = serviciosDisponibles.find(s => s.nombre === value);
                if (svc?.costo) setNuevoPrecio(String(svc.costo));
              }}
            />
          </div>


          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Teléfono</label>
            <div className={styles.phoneWrapper}>
              <span className={styles.phonePrefix}>+591</span>
              <input
                type="tel"
                value={nuevoTelefono}
                onChange={e => setNuevoTelefono(e.target.value)}
                placeholder="70011223"
                className={styles.inputField}
              />
            </div>
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label>Notas</label>
            <textarea
              value={nuevasNotas}
              onChange={e => setNuevasNotas(e.target.value)}
              placeholder="Notas sobre la reserva..."
              className={styles.inputField}
              rows={3}
            />
          </div>
        </div>

        {message && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <div className={styles.formActions}>
          <button type="button" className={styles.cancelButton} onClick={() => router.push('/admin/reservas')}>
            Cancelar
          </button>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Guardando...' : (
              <>
                <Save size={17} strokeWidth={1.8} />
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditarReservaPage() {
  return (
    <div className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <EditarReservaContent />
      </main>
    </div>
  );
}
