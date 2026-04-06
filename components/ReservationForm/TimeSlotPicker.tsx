'use client';

import { useState } from 'react';
import { type SlotStatus } from '@/lib/utils/hoursAvailability';
import { HORAS } from '@/lib/constants/reservationForm';
import styles from './ReservationForm.module.css';

interface TimeSlotPickerProps {
  horaDesde: string;
  horaHasta: string;
  hoursAvailability: Map<string, SlotStatus>;
  onSelect: (desde: string, hasta: string) => void;
}

export function TimeSlotPicker({
  horaDesde,
  horaHasta,
  hoursAvailability,
  onSelect,
}: TimeSlotPickerProps) {
  const [selecting, setSelecting] = useState<string | null>(null);

  // Solo mostrar horas que no sean 'unavailable'
  const visibleHoras = HORAS.filter(h => hoursAvailability.get(h) !== 'unavailable');

  const handleClick = (hora: string) => {
    const status = hoursAvailability.get(hora);
    if (status !== 'free') return;

    if (!selecting) {
      const idx = HORAS.indexOf(hora);
      const siguiente = HORAS[idx + 1] || hora;
      setSelecting(hora);
      onSelect(hora, siguiente);
    } else {
      if (hora === selecting) {
        setSelecting(null);
        onSelect('', '');
        return;
      }
      if (hora < selecting) {
        const idx = HORAS.indexOf(hora);
        const siguiente = HORAS[idx + 1] || hora;
        setSelecting(hora);
        onSelect(hora, siguiente);
        return;
      }
      onSelect(selecting, hora);
      setSelecting(null);
    }
  };

  const isInRange = (hora: string) =>
    horaDesde && horaHasta && hora >= horaDesde && hora < horaHasta;

  const hint = selecting
    ? `Selecciona la hora de fin (después de ${selecting})`
    : 'Selecciona la hora de inicio';

  if (visibleHoras.length === 0) {
    return (
      <div className={styles.pickerPlaceholder}>
        No hay horarios disponibles para este servicio en el día seleccionado
      </div>
    );
  }

  return (
    <div className={styles.timeSlotPicker}>
      {/* Leyenda */}
      <div className={styles.timeSlotPickerLegend}>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: 'rgba(20,174,239,0.65)', border: '1px solid rgba(20,174,239,0.4)' }}
          />
          Libre
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: 'rgba(236,0,140,0.50)', border: '1px solid rgba(236,0,140,0.3)' }}
          />
          Ocupado
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: '#EC008C', boxShadow: '0 0 6px rgba(236,0,140,0.6)' }}
          />
          Seleccionado
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontStyle: 'italic',
            color: 'rgba(245,245,245,0.35)',
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          {hint}
        </span>
      </div>

      {/* Grid */}
      <div className={styles.timeSlotGrid}>
        {visibleHoras.map((hora) => {
          const status = hoursAvailability.get(hora) ?? 'unavailable';
          const inRange = isInRange(hora);
          const isStart = hora === horaDesde;

          return (
            <button
              key={hora}
              type="button"
              className={[
                styles.timeChip,
                status === 'full' ? styles.timeChipReserved : '',
                status === 'past' ? styles.timeChipPast : '',
                inRange ? styles.timeChipSelected : '',
                isStart ? styles.timeChipStart : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleClick(hora)}
              disabled={status !== 'free'}
              title={
                status === 'full' ? `${hora} — Ocupado`
                  : status === 'past' ? `${hora} — Pasado`
                    : hora
              }
            >
              {hora}
            </button>
          );
        })}
      </div>

      {/* Rango seleccionado */}
      {horaDesde && horaHasta && (
        <div className={styles.selectedRange}>
          <span className={styles.selectedRangeIcon}>✦</span>
          {horaDesde} → {horaHasta}
        </div>
      )}
    </div>
  );
}