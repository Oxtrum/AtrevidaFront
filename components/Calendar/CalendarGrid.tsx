'use client';

import { useState, useEffect, useMemo } from 'react';
import { DiaSemana, ApiResponse, FechaDia, ReservaPorHora, type ReservaDetalle } from '@/types/reserva';
import TimeSlotPublico from './TimeSlotPublico';
import TimeSlotAdmin from './TimeSlotAdmin';
import styles from './Calendar.module.css';

const DIAS: DiaSemana[] = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

const DIA_CORTO: Record<DiaSemana, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIÉRCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SÁBADO: 'Sáb',
};

interface CalendarGridProps {
  data: ApiResponse | null;
  fechas: Map<DiaSemana, FechaDia> | null;
  isAdmin?: boolean;
  onSlotClick?: (hora: string, dia: DiaSemana, slots: any) => void;
  selectedDay?: DiaSemana | null;
  onDayChange?: (day: DiaSemana) => void;
  loading?: boolean;
  error?: string;
}

/**
 * Extrae las horas de reserva de la API (solo las que existen, no hardcodeadas)
 */
function obtenerHorasDelAPI(data: ApiResponse | null): ReservaPorHora[] {
  const reservasData = data?.data?.reservas ?? [];
  if (reservasData.length === 0) return [];

  const primerLocal = reservasData[0];
  if (!primerLocal?.semanas || primerLocal.semanas.length === 0) return [];

  // Mergear TODAS las semanas en un mapa keyed by hora
  const horaMap = new Map<string, ReservaPorHora>();

  for (const semana of primerLocal.semanas) {
    for (const horaObj of semana.reservas ?? []) {
      if (!horaMap.has(horaObj.hora)) {
        horaMap.set(horaObj.hora, { hora: horaObj.hora, dias: {} });
      }

      const existing = horaMap.get(horaObj.hora)!;

      // Mergear los días, concatenando sus slots
      for (const [dia, slots] of Object.entries(horaObj.dias)) {
        const diaKey = dia as DiaSemana;
        if (!existing.dias[diaKey]) {
          existing.dias[diaKey] = [];
        }
        existing.dias[diaKey]!.push(...(slots as ReservaDetalle[]));
      }
    }
  }

  const parseMinutos = (hora: string) => {
    const match = hora.match(/^(\d+)(?::(\d+))?/);
    return parseInt(match?.[1] ?? '0') * 60 + parseInt(match?.[2] ?? '0');
  };

  return Array.from(horaMap.values()).sort(
    (a, b) => parseMinutos(a.hora) - parseMinutos(b.hora)
  );
}

export default function CalendarGrid({
  data,
  fechas,
  isAdmin = false,
  onSlotClick,
  selectedDay,
  onDayChange,
  loading = false,
  error = undefined,
}: CalendarGridProps) {
  const [mobile, setMobile] = useState(false);
  const [activeDay, setActiveDay] = useState<DiaSemana>('LUNES');

  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Obtener solo las horas que existen en la API (sin hardcodear)
  const horasDelAPI = useMemo(() => obtenerHorasDelAPI(data), [data]);

  const diaActual = selectedDay ?? activeDay;
  const diasVisibles = mobile ? [diaActual] : DIAS;

  const cambiarDia = (dia: DiaSemana) => {
    setActiveDay(dia);
    onDayChange?.(dia);
  };

  const handleSlotClick = (hora: string, dia: DiaSemana, horaObj: ReservaPorHora) => {
    if (onSlotClick) {
      const slots = horaObj.dias[dia];
      onSlotClick(hora, dia, slots);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}>Cargando calendario...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.errorMessage}>Error: {error}</div>
      </div>
    );
  }

  if (horasDelAPI.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.emptyMessage}>No hay datos disponibles</div>
      </div>
    );
  }

  const TimeSlotComponent = isAdmin ? TimeSlotAdmin : TimeSlotPublico;

  return (
    <div className={styles.calendarContainer}>
      {/* Selector de días para mobile */}
      {mobile && (
        <div className={styles.daySelectorMobile}>
          {DIAS.map(dia => {
            const info = fechas?.get(dia);
            const esPasado = info?.esPasado || false;
            return (
              <button
                key={dia}
                type="button"
                className={`${styles.dayButton} ${diaActual === dia ? styles.daySelectorActive : ''
                  } ${esPasado ? styles.dayButtonPasado : ''}`}
                onClick={() => cambiarDia(dia)}
                disabled={esPasado}
              >
                <span className={styles.dayButtonShort}>{DIA_CORTO[dia]}</span>
                {info && <span className={styles.dayButtonDate}>{info.dia}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid principal */}
      <div className={mobile ? styles.calendarGridMobile : styles.calendarGrid}>
        {/* Esquina superior izquierda */}
        <div className={styles.cornerCell} />

        {/* Headers con días */}
        {diasVisibles.map(dia => {
          const info = fechas?.get(dia);
          const esPasado = info?.esPasado || false;
          return (
            <div key={dia} className={`${styles.calendarHeader} ${esPasado ? styles.headerPasado : ''}`}>
              <span className={styles.headerDay}>{DIA_CORTO[dia]}</span>
              {info && (
                <span className={styles.headerDate}>
                  {info.dia}
                  <span className={styles.headerMonth}>{info.mes}</span>
                </span>
              )}
            </div>
          );
        })}

        {/* Filas de horas */}
        {horasDelAPI.map((horaObj, rowIdx) => {
          // Extraer hora inicio y fin del formato "14:30 a 15:00" o "14 a 14:30"
          const horaPartes = horaObj.hora.split(' a ').map(h => h.trim());
          const horaInicio = horaPartes[0] || '';
          const horaFin = horaPartes[1] || '';

          return (
            <div key={rowIdx} className={styles.calendarRow}>
              {/* Celda de tiempo */}
              <div className={styles.timeCell}>
                <span className={styles.timeStart}>{horaInicio}</span>
                <span className={styles.timeEnd}>{horaFin}</span>
              </div>

              {/* Slots de cada día */}
              {(mobile ? diasVisibles : DIAS).map(dia => {
                const fechaInfo = fechas?.get(dia);
                const esPasado = fechaInfo?.esPasado || false;
                const slots = horaObj.dias[dia];

                return (
                  <TimeSlotComponent
                    key={`${rowIdx}-${dia}`}
                    dia={dia}
                    slots={slots}
                    hora={horaObj.hora}
                    fecha={fechaInfo?.fecha || new Date()}
                    onClick={() => handleSlotClick(horaObj.hora, dia, horaObj)}
                    esPasado={esPasado}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
