'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { DiaSemana, generarSemanas, getFechasDeSemana } from '@/types/reserva';
import { useLocales } from '@/lib/hooks/useLocales';
import { useReservasCalendario } from '@/lib/hooks/useReservasCalendario';
import CalendarGrid from './CalendarGrid';
import styles from './Calendar.module.css';
import { CustomSelect } from '../Custom/CustomSelect';

interface CalendarPublicoProps {
  localInicial?: string;
  semanaInicial?: string;
  onSlotClick?: (hora: string, dia: DiaSemana, slots: any) => void;
  onSucursalChange?: (sucursal: string) => void;
  onSemanaChange?: (semana: string) => void;
}

/**
 * CalendarPublico - Versión para cliente público
 * - Muestra disponibilidad general (+ o ocupado) 
 * - No muestra nombres de clientes
 * - Dirigido a usuario que quiere hacer una reserva
 */
export default function CalendarPublico({
  localInicial = '',
  onSlotClick,
  onSucursalChange,
  onSemanaChange,
}: CalendarPublicoProps) {
  const [sucursal, setSucursal] = useState(localInicial);
  const [semanaIndex, setSemanaIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<DiaSemana | null>(null);

  const { data, loading, error, fetch: fetchReservas } = useReservasCalendario();
  const { locales } = useLocales();
  const sucursalEfectiva = sucursal || locales[0]?.nombre || '';

  const controlsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const semanasDisponibles = useMemo(() => generarSemanas(6), []);
  const semanaActual = semanasDisponibles[semanaIndex];
  const fechas = useMemo(() => (semanaActual ? getFechasDeSemana(semanaActual.fechaInicio) : null), [semanaActual]);

  // Fetch reservas cuando cambian sucursal o semana
  useEffect(() => {
    if (sucursalEfectiva && semanaActual) {
      const fechaInicio = semanaActual.fechaInicio.toISOString().split('T')[0];
      const fechaFin = new Date(semanaActual.fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 5);
      const fechaHasta = fechaFin.toISOString().split('T')[0];

      fetchReservas({
        local: sucursalEfectiva,
        fecha_desde: fechaInicio,
        fecha_hasta: fechaHasta,
      });
    }
  }, [sucursalEfectiva, semanaIndex, semanaActual, fetchReservas]);

  const handleSucursalChange = (value: string) => {
    setSucursal(value);
    setSelectedDay(null);
    onSucursalChange?.(value);
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        controlsRef.current,
        { opacity: 0, y: -30 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }
      );

      gsap.to('.calendarOrb', {
        y: '+=25',
        duration: 3.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.8 },
      });
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!loading && gridRef.current) {
      gsap.fromTo(
        gridRef.current,
        { opacity: 0, y: 20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [loading, data]);

  const handleSemanaChange = (value: string) => {
    setSemanaIndex(Number(value));
    onSemanaChange?.(value);
  };

  const sucursalOptions = useMemo(
    () => locales.map(l => ({ value: l.nombre, label: l.nombre })),
    [locales]
  );

  const handleSlotClick = (hora: string, dia: DiaSemana, slots: any) => {
    if (onSlotClick) {
      onSlotClick(hora, dia, slots);
    }
  };

  return (
    <div ref={wrapperRef} className={styles.calendarWrapper}>
      <div className={styles.orbContainer}>
        <div className={`${styles.orb} ${styles.orb1} calendarOrb`} />
        <div className={`${styles.orb} ${styles.orb2} calendarOrb`} />
        <div className={`${styles.orb} ${styles.orb3} calendarOrb`} />
      </div>

      <div ref={controlsRef} className={styles.controls}>
        <div className={styles.controlGroup}>
          <label>Sucursal</label>
          <CustomSelect
            onChange={handleSucursalChange}
            value={sucursalEfectiva}
            options={sucursalOptions}
            placeholder="Seleccionar sucursal"
          />
        </div>

        <div className={styles.controlGroup}>
          <label htmlFor="semana-select">Semana</label>
          <CustomSelect
            onChange={handleSemanaChange}
            value={semanaIndex.toString()}
            options={semanasDisponibles.map((semana, idx) => ({
              value: idx.toString(),
              label: semana.titulo,
            }))}
          />
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <h3>Error al cargar</h3>
          <p>{error}</p>
        </div>
      ) : !sucursalEfectiva ? (
        <div className={styles.emptyState}>
          <h3>Selecciona una sucursal</h3>
          <p>Elige una sucursal para ver las reservas disponibles</p>
        </div>
      ) : (
        <div ref={gridRef}>
          <CalendarGrid
            data={data}
            fechas={fechas}
            isAdmin={false}
            onSlotClick={handleSlotClick}
            selectedDay={selectedDay}
            onDayChange={setSelectedDay}
            loading={loading}
            error={error || undefined}
          />
        </div>
      )}
    </div>
  );
}
