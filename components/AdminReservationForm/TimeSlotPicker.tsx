'use client';

import { Clock3 } from 'lucide-react';
import { SlotStatus } from '@/lib/utils/hoursAvailability';
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

  const handleClick = (hora: string) => {
    const status = hoursAvailability.get(hora);
    if (status === 'past' || status === 'occupied') return;

    const idx = HORAS.indexOf(hora);
    const siguiente = HORAS[idx + 1] || hora;
    onSelect(hora, siguiente);
  };

  const isInRange = (hora: string): boolean => {
    if (!horaDesde || !horaHasta) return false;
    const idxHora = HORAS.indexOf(hora);
    const idxDesde = HORAS.indexOf(horaDesde);
    const idxHasta = HORAS.indexOf(horaHasta);
    if (idxHora === -1 || idxDesde === -1 || idxHasta === -1) return false;
    return idxHora >= idxDesde && idxHora < idxHasta;
  };

  const getStatus = (hora: string): SlotStatus => {
    return hoursAvailability.get(hora) ?? 'free';
  };

  return (
    <div className={styles.timeSlotPicker}>

      {/* Leyenda */}
      <div className={styles.timeSlotPickerLegend}>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: 'rgba(20, 174, 239, 0.35)', border: '1px solid rgba(20, 174, 239, 0.65)' }}
          />
          Libre
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: 'rgba(255, 230, 0, 0.32)', border: '1px solid rgba(255, 230, 0, 0.65)' }}
          />
          Ocupado
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: 'var(--admin-accent-primary)' }}
          />
          Seleccionado
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid var(--admin-border)' }}
          />
          Pasado
        </span>
      </div>

      {/* Grid */}
      <div className={styles.timeSlotGrid}>
        {HORAS.map((hora) => {
          const status = getStatus(hora);
          const inRange = isInRange(hora);
          const isStart = hora === horaDesde;
          const isPast = status === 'past';
          const isOccupied = status === 'occupied';

          return (
            <button
              key={hora}
              type="button"
              className={[
                styles.timeChip,
                isPast ? styles.timeChipPast : '',
                isOccupied ? styles.timeChipOccupied : '',
                inRange ? styles.timeChipSelected : '',
                isStart ? styles.timeChipStart : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleClick(hora)}
              disabled={isPast || isOccupied}
              title={
                isPast ? `${hora} — Pasado`
                  : isOccupied ? `${hora} — Ocupado`
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
          <Clock3 size={14} strokeWidth={1.8} className={styles.selectedRangeIcon} />
          {horaDesde} a {horaHasta}
        </div>
      )}

    </div>
  );
}
