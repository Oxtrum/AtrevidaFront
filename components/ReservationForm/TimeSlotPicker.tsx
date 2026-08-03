'use client';

import { SlotStatus } from '@/lib/utils/hoursAvailability';
import { HORAS, HORAS_INICIO } from '@/lib/constants/reservationForm';
import { duracionRango, formatearDuracion } from '@/lib/utils/slotRange';
import styles from './ReservationForm.module.css';

interface TimeSlotPickerProps {
  horaDesde: string;
  horaHasta: string;
  hoursAvailability: Map<string, SlotStatus>;
  onSelect: (desde: string) => void;
}

export function TimeSlotPicker({
  horaDesde,
  horaHasta,
  hoursAvailability,
  onSelect,
}: TimeSlotPickerProps) {

  const handleClick = (hora: string) => {
    const status = hoursAvailability.get(hora);

    // No permitir seleccionar horas pasadas, ocupadas o fuera de atención
    if (status === 'past' || status === 'occupied' || status === 'closed') return;

    // El hook arma el rango: el primer click abre la reserva y los siguientes
    // la estiran o la recortan.
    onSelect(hora);
  };

  const idxDesde = HORAS.indexOf(horaDesde);
  const idxHasta = HORAS.indexOf(horaHasta);
  const rangoValido = Boolean(horaDesde && horaHasta) && idxDesde !== -1 && idxHasta !== -1;

  const isInRange = (hora: string): boolean => {
    if (!rangoValido) return false;
    const idxHora = HORAS.indexOf(hora);
    if (idxHora === -1) return false;
    return idxHora >= idxDesde && idxHora < idxHasta;
  };

  /** Último bloque incluido: el click siguiente sobre él suma media hora. */
  const isLastInRange = (hora: string): boolean =>
    rangoValido && HORAS.indexOf(hora) === idxHasta - 1;

  /** Chip donde termina la reserva: se muestra como borde, no como bloque. */
  const isEndBoundary = (hora: string): boolean => rangoValido && hora === horaHasta;

  const duracion = formatearDuracion(duracionRango(horaDesde, horaHasta));

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
            style={{ background: 'rgba(255,230,0,0.50)', border: '1px solid rgba(255,230,0,0.3)' }}
          />
          Ocupado
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: 'rgba(245,245,245,0.16)', border: '1px solid rgba(245,245,245,0.12)' }}
          />
          No atiende
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
        {HORAS_INICIO.map((hora) => {
          const status = getStatus(hora);
          const inRange = isInRange(hora);
          const isStart = hora === horaDesde;
          const isEnd = isLastInRange(hora);
          const isBoundary = isEndBoundary(hora);
          const isPast = status === 'past';
          const isOccupied = status === 'occupied';
          const isClosed = status === 'closed';

          return (
            <button
              key={hora}
              type="button"
              className={[
                styles.timeChip,
                isPast ? styles.timeChipPast : '',
                isOccupied ? styles.timeChipOccupied : '',
                isClosed ? styles.timeChipClosed : '',
                inRange ? styles.timeChipSelected : '',
                isStart ? styles.timeChipStart : '',
                isEnd ? styles.timeChipEnd : '',
                isBoundary ? styles.timeChipBoundary : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleClick(hora)}
              disabled={isPast || isOccupied || isClosed}
              title={
                isPast ? `${hora} — Pasado`
                  : isOccupied ? `${hora} — Ocupado`
                    : isClosed ? `${hora} — No atiende`
                      : isBoundary ? `${hora} — Fin de la reserva (toca para sumar 30 min)`
                        : isEnd ? `${hora} — Último bloque`
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
          {duracion && <span className={styles.selectedRangeDuration}>{duracion}</span>}
        </div>
      )}

      {/* Ayuda: la selección se arma con varios toques */}
      <p className={styles.slotHint}>
        {horaDesde
          ? 'Toca otra hora para alargar la reserva (cada bloque suma 30 min) o una hora anterior para empezar de nuevo.'
          : 'Toca una hora para empezar y sigue tocando para alargar la reserva.'}
      </p>
    </div>
  );
}
