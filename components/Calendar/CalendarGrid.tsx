'use client';

import { useState, useEffect, useMemo } from 'react';
import { TimeSlotInfo, DiaSemana, ApiResponse, FechaDia, normalizeTipo } from '@/types/reserva';
import TimeSlot from './TimeSlot';
import styles from './Calendar.module.css';
import { HORAS } from '@/lib/constants/reservationForm';

const DIAS: DiaSemana[] = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];



const DIA_CORTO: Record<DiaSemana, string> = {
  LUNES: 'Lun', MARTES: 'Mar', MIÉRCOLES: 'Mié',
  JUEVES: 'Jue', VIERNES: 'Vie', SÁBADO: 'Sáb',
};

interface Props {
  data: ApiResponse | null;
  fechas: Map<DiaSemana, FechaDia> | null;
  onSlotClick?: (slot: TimeSlotInfo) => void;
  selectedDay?: DiaSemana | null;
  onDayChange?: (day: DiaSemana) => void;
}

function getSlots(data: ApiResponse | null, fechas: Map<DiaSemana, FechaDia> | null) {
  const slots: TimeSlotInfo[][] = [];
  const reservasData = data?.data?.reservas ?? [];

  for (const hora of HORAS) {
    const idx = HORAS.indexOf(hora);
    const horaFin = HORAS[idx+1] || '20:30';

    const fila: TimeSlotInfo[] = DIAS.map(dia => {
      const fechaInfo = fechas?.get(dia);
      return {
        hora,
        horaFin,
        dia,
        fecha: fechaInfo?.fecha || new Date(),
        reservado: false,
        esPasado: fechaInfo?.esPasado || false,
        reservas: [],
      };
    });

    for (const local of reservasData) {
      for (const semana of local.semanas ?? []) {
        for (const reserva of semana.reservas ?? []) {
          const match = reserva.hora.match(/^(\d{1,2}:\d{2})/);
          if (!match) continue;
          const horaReserva = match[1];

          if (horaReserva !== hora) continue;

          for (const [diaKey, items] of Object.entries(reserva.dias ?? {})) {
            const dia = diaKey.toUpperCase() as DiaSemana;
            if (!DIAS.includes(dia)) continue;
            if (!Array.isArray(items)) continue;

            const colIdx = DIAS.indexOf(dia);
            if (colIdx === -1) continue;

            for (const item of items) {
              const tipo = normalizeTipo(item.tipo);
              const esFeriado = tipo === 'feriado';

              fila[colIdx].reservas.push({
                tipo,
                cliente: item.cliente || '',
                servicio: item.servicio || '',
                esFeriado,
              });
            }

            if (items.length > 0) {
              fila[colIdx].reservado = true;
            }
          }
        }
      }
    }

    slots.push(fila);
  }

  return slots;
}

export default function CalendarGrid({ data, fechas, onSlotClick, selectedDay, onDayChange }: Props) {
  const [mobile, setMobile] = useState(false);
  const [activeDay, setActiveDay] = useState<DiaSemana>('LUNES');

  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const slots = useMemo(() => getSlots(data, fechas), [data, fechas]);

  const diaActual = selectedDay ?? activeDay;
  const diasVisibles = mobile ? [diaActual] : DIAS;

  const cambiarDia = (dia: DiaSemana) => {
    setActiveDay(dia);
    onDayChange?.(dia);
  };

  return (
    <div className={styles.calendarContainer}>
      {mobile && (
        <div className={styles.daySelectorMobile}>
          {DIAS.map(dia => {
            const info = fechas?.get(dia);
            const esPasado = info?.esPasado || false;
            return (
              <button
                key={dia}
                type="button"
                className={`${styles.dayButton} ${diaActual === dia ? styles.daySelectorActive : ''} ${esPasado ? styles.dayButtonPasado : ''}`}
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

      <div className={mobile ? styles.calendarGridMobile : styles.calendarGrid}>
        <div className={styles.cornerCell} />

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

        {slots.map((fila, ri) => (
          <div key={ri} className={styles.calendarRow}>
            <div className={styles.timeCell}>
              <span className={styles.timeStart}>{fila[0].hora}</span>
              <span className={styles.timeEnd}>{fila[0].horaFin}</span>
            </div>

            {(mobile ? fila.filter(s => s.dia === diaActual) : fila).map((slot, ci) => {
              const fechaInfo = fechas?.get(slot.dia);
              const esPasado = slot.esPasado || fechaInfo?.esPasado || false;

              return (
                <TimeSlot
                  key={`${ri}-${ci}`}
                  slot={slot}
                  onSlotClick={onSlotClick}
                  esPasado={esPasado}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
