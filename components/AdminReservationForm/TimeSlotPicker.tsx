'use client';

import { Clock3 } from 'lucide-react';
import { SlotStatus } from '@/lib/utils/hoursAvailability';
import { HORAS, HORAS_INICIO } from '@/lib/constants/reservationForm';
import { duracionRango, formatearDuracion } from '@/lib/utils/slotRange';
import styles from './ReservationForm.module.css';

interface TimeSlotPickerProps {
  horaDesde: string;
  horaHasta: string;
  hoursAvailability: Map<string, SlotStatus>;
  onSelect: (desde: string) => void;
  /** `true` si el próximo clic ajusta la duración; `false` si elige un nuevo inicio. */
  esperandoAjuste?: boolean;
}

export function TimeSlotPicker({
  horaDesde,
  horaHasta,
  hoursAvailability,
  onSelect,
  esperandoAjuste = false,
}: TimeSlotPickerProps) {

  const handleClick = (hora: string) => {
    const status = hoursAvailability.get(hora);

    // No permitir seleccionar horas pasadas, ocupadas o fuera de atención
    if (status === 'past' || status === 'occupied' || status === 'closed') return;

    // El hook arma el rango en un ciclo de 2 clicks: el de inicio (toma la
    // duración del servicio) y el de ajuste (recorta o estira el fin). El
    // siguiente click después de ajustar vuelve a ser de inicio.
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

  /** Último bloque que ocupa la reserva (el chip de `horaHasta` ya queda fuera). */
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
            style={{ background: 'rgba(20, 174, 239, 0.35)', border: '1px solid rgba(20, 174, 239, 0.65)' }}
          />
          Libre
        </span>
        <span>
          <span
            className={styles.legendDot}
            style={{ background: 'rgba(120, 120, 130, 0.3)', border: '1px solid rgba(150, 150, 160, 0.5)' }}
          />
          Sin espacios
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
                  : isOccupied ? `${hora} — Sin ambientes libres a esta hora`
                    : isClosed ? `${hora} — No atiende`
                      : isBoundary ? `${hora} — Fin de la reserva${esperandoAjuste ? ' (clic para incluir este bloque)' : ''}`
                        : isEnd ? `${hora} — Último bloque incluido`
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
          {duracion && <span className={styles.selectedRangeDuration}>{duracion}</span>}
        </div>
      )}

      {/* Ayuda: ciclo de 2 clicks — inicio (duración automática) y ajuste */}
      <p className={styles.slotHint}>
        {!horaDesde
          ? 'Clic en una hora para empezar: toma la duración del servicio automáticamente.'
          : esperandoAjuste
            ? 'Clic en el último bloque que ocupe la reserva para ajustar la duración.'
            : 'Clic en cualquier hora para elegir un nuevo inicio.'}
      </p>

    </div>
  );
}
