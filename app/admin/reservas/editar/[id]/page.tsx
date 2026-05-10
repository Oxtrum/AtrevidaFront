'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRef, useState, useEffect, useMemo } from 'react';
import gsap from 'gsap';
import Header from '@/components/Header/Header';
import { actualizarReservaDB, getReservaByID } from '@/lib/api/reservas';
import { DiaSemana, ReservaBD, generarSemanas, getFechasDeSemana, esFechaPasada } from '@/types/reserva';
import { HORAS, DIAS_SEMANA } from '@/lib/constants/reservationForm';
import { DaySelector } from '@/components/ReservationForm/DaySelector';
import { TimeSlotPicker } from '@/components/ReservationForm/TimeSlotPicker';
import { CustomSelect } from '@/components/Custom/CustomSelect';
import type { SlotStatus } from '@/lib/utils/hoursAvailability';
import styles from './page.module.css';

function EditarReservaContent() {
  const params = useParams();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const reservaId = params.id as string;

  const [reserva, setReserva] = useState<ReservaBD | null>(null);

  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHoraDesde, setNuevaHoraDesde] = useState('');
  const [nuevaHoraHasta, setNuevaHoraHasta] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [clienteName, setClienteName] = useState('');

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

  const hoursAvailability = useMemo(() => {
    const map = new Map<string, SlotStatus>();

    for (const hora of HORAS) {
      const hoy = new Date();
      const [hh, mm] = hora.split(':').map(Number);
      const slotMin = hh * 60 + mm;
      const ahoraMin = hoy.getHours() * 60 + hoy.getMinutes();

      const fechaDiaStr = nuevaFecha;
      const hoyStr = new Date().toLocaleDateString('en-CA');

      if (fechaDiaStr < hoyStr || (fechaDiaStr === hoyStr && slotMin < ahoraMin)) {
        map.set(hora, 'past');
      } else {
        map.set(hora, 'free');
      }
    }

    return map;
  }, [nuevaFecha]);

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
          setClienteName(found.cliente);
          
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
      } catch (err) {
        setMessage({ type: 'error', text: 'Error al cargar reserva' });
      } finally {
        setInitialLoading(false);
      }
    };

    loadReserva();
  }, [reservaId, semanasDisponibles]);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
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
      const tipoMapping = (reserva.tipo.toLowerCase().startsWith('b')) ? 'B' as const : 'M' as const;
      
      const result = await actualizarReservaDB({
        id: reserva.id,
        local: reserva.local,
        fecha: reserva.fecha,
        hora: reserva.hora_desde,
        tipo: tipoMapping,
        cliente: reserva.cliente,
        nueva_fecha: nuevaFecha,
        nueva_hora_desde: nuevaHoraDesde,
        nuevo_tipo: tipoMapping,
      });

      if (result.mensaje?.toLowerCase().includes('error') || result.mensaje?.toLowerCase().includes('no encontrada')) {
        setMessage({ type: 'error', text: result.mensaje || 'Error al actualizar' });
      } else {
        setMessage({ type: 'success', text: result.mensaje || 'Reserva actualizada correctamente' });
        setTimeout(() => {
          router.push('/admin/reservas');
        }, 1500);
      }
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
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.editForm}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Semana</label>
            <CustomSelect
              value={String(semanaIndex)}
              onChange={handleSemanaChange}
              options={semanaOptions}
              hasError={false}
            />
          </div>

          {/* <div className={`${styles.formGroup}`}>
            <label>Cliente</label>
            <input
              type="text"
              value={clienteName}
              onChange={e => setClienteName(e.target.value)}
              placeholder="Nombre del cliente"
              className={styles.inputField}
              required
            />
          </div> */}

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
            {loading ? 'Guardando...' : '✦ Guardar cambios'}
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
