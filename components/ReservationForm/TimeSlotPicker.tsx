'use client';

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

    // No permitir seleccionar horas pasadas
    if (status === 'past') return;

    // Selección inmediata de 1 hora
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
      </div>

      {/* Grid */}
      <div className={styles.timeSlotGrid}>
        {HORAS.map((hora) => {
          const status = getStatus(hora);
          const inRange = isInRange(hora);
          const isStart = hora === horaDesde;
          const isPast = status === 'past';

          return (
            <button
              key={hora}
              type="button"
              className={[
                styles.timeChip,
                isPast ? styles.timeChipPast : '',
                inRange ? styles.timeChipSelected : '',
                isStart ? styles.timeChipStart : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleClick(hora)}
              disabled={isPast}
              title={
                isPast ? `${hora} — Pasado`
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
