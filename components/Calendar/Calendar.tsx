'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { TimeSlotInfo, SUCURSALES, DiaSemana, generarSemanas, getFechasDeSemana } from '@/types/reserva';
import { useReservas } from '@/lib/hooks/useReservas';
import CalendarGrid from './CalendarGrid';
import styles from './Calendar.module.css';
import { CustomSelect } from '../Custom/CustomSelect';

interface CalendarProps {
  localInicial?: string;
  semanaInicial?: string;
  onSlotClick?: (slot: TimeSlotInfo) => void;
}

export default function Calendar({ localInicial = '', onSlotClick }: CalendarProps) {
  const [sucursal, setSucursal] = useState(localInicial);
  const [semanaIndex, setSemanaIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<DiaSemana | null>(null);

  const { data, loading, error, fetch: fetchReservas } = useReservas();

  const controlsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const semanasDisponibles = useMemo(() => generarSemanas(6), []);
  const semanaActual = semanasDisponibles[semanaIndex];
  const fechas = useMemo(() => semanaActual ? getFechasDeSemana(semanaActual.fechaInicio) : null, [semanaActual]);

  // Fetch reservas cuando cambian sucursal o semana
  useEffect(() => {
    fetchReservas({ local: sucursal, semana: semanaIndex + 1 });
  }, [sucursal, semanaIndex, fetchReservas]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(controlsRef.current,
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
      gsap.fromTo(gridRef.current,
        { opacity: 0, y: 20, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, [loading, data]);

  const handleSucursalChange = (value: string) => {
    setSucursal(value);
    setSelectedDay(null);
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
          <label >Sucursal</label>
          <CustomSelect onChange={(e) => handleSucursalChange(e)}
            value={sucursal}
            options={SUCURSALES.map(s => ({ value: s.value, label: s.label }))}
            placeholder='Seleccionar sucursal'

          />
        </div>

        <div className={styles.controlGroup}>
          <label htmlFor="semana-select">Semana</label>
          <CustomSelect
            onChange={(e) => setSemanaIndex(Number(e))}
            value={semanaIndex.toString()}
            options={semanasDisponibles.map((semana, idx) => ({ value: idx.toString(), label: semana.titulo }))}
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
      ) : !sucursal ? (
        <div className={styles.emptyState}>
          <h3>Selecciona una sucursal</h3>
          <p>Elige una sucursal para ver las reservas disponibles</p>
        </div>
      ) : (
        <div ref={gridRef}>
          <CalendarGrid
            data={data}
            fechas={fechas}
            onSlotClick={onSlotClick}
            selectedDay={selectedDay}
            onDayChange={setSelectedDay}
          />
        </div>
      )}
    </div>
  );
}
