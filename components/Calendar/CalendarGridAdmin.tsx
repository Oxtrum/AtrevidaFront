'use client';

import { useState, useEffect, useMemo } from 'react';
import { DiaSemana, ApiResponse, FechaDia, ReservaPorHora, type ReservaDetalle } from '@/types/reserva';
import { HORAS } from '@/lib/constants/reservationForm';
import TimeSlotPublico from './TimeSlotPublico';
import TimeSlotAdmin from './TimeSlotAdminAdmin';
import styles from './CalendarAdmin.module.css';

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
function obtenerHorasFijas(data: ApiResponse | null): ReservaPorHora[] {
  // Crear el esqueleto basado en HORAS (que ahora son de hora en hora)
  const grid: ReservaPorHora[] = [];
  for (let i = 0; i < HORAS.length; i++) {
    const start = HORAS[i];
    let end = HORAS[i + 1];

    if (!end) {
      const [hh, mm] = start.split(':').map(Number);
      end = `${(hh + 1).toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    }

    grid.push({
      hora: `${start} a ${end}`,
      dias: {}
    });
  }

  if (!data?.data?.reservas) return grid;

  const reservasData = data.data.reservas;
  if (reservasData.length === 0) return grid;

  const primerLocal = reservasData[0];
  if (!primerLocal?.semanas) return grid;

  const toMin = (h: string) => {
    if (!h) return -1;
    const clean = h.trim().replace(/^0/, '');
    const [hh, mm] = clean.split(':').map(Number);
    return hh * 60 + (mm || 0);
  };

  for (const semana of primerLocal.semanas) {
    for (const horaObj of semana.reservas ?? []) {
      const horaInicioAPI = toMin(horaObj.hora.split(' a ')[0]);
      const targetSlot = grid.find(s => toMin(s.hora.split(' a ')[0]) === horaInicioAPI);

      if (targetSlot) {
        for (const [dia, slots] of Object.entries(horaObj.dias)) {
          const diaKey = dia as DiaSemana;
          if (!targetSlot.dias[diaKey]) targetSlot.dias[diaKey] = [];
          targetSlot.dias[diaKey]!.push(...(slots as ReservaDetalle[]));
        }
      }
    }
  }

  return grid;
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

  // Usar horas fijas basadas en la constante HORAS
  const horasGrid = useMemo(() => obtenerHorasFijas(data), [data]);

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

  if (horasGrid.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.emptyMessage}>No hay horarios configurados</div>
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

        {/* Filas de horas — cada celda va directo al grid, sin wrapper */}
        {horasGrid.map((horaObj, rowIdx) => {
          const horaPartes = horaObj.hora.split(' a ').map(h => h.trim());
          const horaInicio = horaPartes[0] || '';
          const horaFin = horaPartes[1] || '';

          return (
            <>
              {/* Celda de tiempo — columna 1 */}
              <div key={`time-${rowIdx}`} className={styles.timeCell}>
                <span className={styles.timeStart}>{horaInicio}</span>
                <span className={styles.timeEnd}>{horaFin}</span>
              </div>

              {/* Slots — columnas 2 a 7 */}
              {(mobile ? diasVisibles : DIAS).map(dia => {
                const fechaInfo = fechas?.get(dia);
                const esPasado = fechaInfo?.esPasado || false;

                return (
                  <TimeSlotComponent
                    key={`${rowIdx}-${dia}`}
                    dia={dia}
                    slots={horaObj.dias[dia]}
                    hora={horaObj.hora}
                    fecha={fechaInfo?.fecha || new Date()}
                    onClick={() => handleSlotClick(horaObj.hora, dia, horaObj)}
                    esPasado={esPasado}
                  />
                );
              })}
            </>
          );
        })}
      </div>
    </div>
  );
}
