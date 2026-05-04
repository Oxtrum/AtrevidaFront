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

  // SIEMPRE mostrar todas las horas 8:00-20:00
  const visibleHoras = HORAS;

  const handleClick = (hora: string) => {
    const status = hoursAvailability.get(hora);
    
    // No permitir seleccionar horas pasadas
    if (status === 'past') return;

    if (!selecting) {
      // Primera selección - hora de inicio
      const idx = HORAS.indexOf(hora);
      const siguiente = HORAS[idx + 1] || hora;
      setSelecting(hora);
      onSelect(hora, siguiente);
    } else {
      // Segunda selección - hora de fin
      if (hora === selecting) {
        // Deseleccionar
        setSelecting(null);
        onSelect('', '');
        return;
      }
      
      // Asegurar que hora fin > hora inicio
      if (hora < selecting) {
        // Si seleccionan en orden inverso
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

  const getStatus = (hora: string): SlotStatus => {
    return hoursAvailability.get(hora) ?? 'free';
  };

  const hint = selecting
    ? `Selecciona la hora de fin (después de ${selecting})`
    : 'Selecciona la hora de inicio';

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
                  : status === 'occupied' ? `${hora} — Ocupado (el backend validará)`
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
