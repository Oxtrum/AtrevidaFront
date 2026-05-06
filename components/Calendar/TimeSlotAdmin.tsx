'use client';

import { DiaSemana, ReservaDetalle, getTipoColor, getTipoLabel } from '@/types/reserva';
import { extraerNombreServicio, esHoraDisponible } from '@/lib/utils/calendarHelpers';
import styles from './Calendar.module.css';
import { SlotBadges } from './SlotBadges';

interface TimeSlotAdminProps {
  dia: DiaSemana;
  slots: ReservaDetalle[] | undefined;
  hora: string;
  fecha: Date;
  onClick?: () => void;
  esPasado?: boolean;
}

/**
 * TimeSlotAdmin - Muestra información detallada de reservas para admin
 * - Verde (+) si hay disponibilidad
 * - Muestra nombre cliente + servicio para cada slot ocupado
 * - Agrupado por tipo de servicio (mesa, bicicleta)
 */
export default function TimeSlotAdmin({
  dia,
  slots,
  hora,
  fecha,
  onClick,
  esPasado = false,
}: TimeSlotAdminProps) {
  const slotsOcupados = slots?.filter(s => s.cliente && s.cliente.trim() !== '') || [];
  const slotsLibres = slots?.filter(s => !s.cliente || s.cliente.trim() === '') || [];

  // Clickeable SOLO si hay slots libres disponibles y no es pasado
  const esClickeable = !esPasado && esHoraDisponible(fecha) && slotsLibres.length > 0;
  const hayDisponibilidad = slotsLibres.length > 0 && !esPasado;

  const handleClick = () => {
    if (esClickeable && onClick) {
      onClick();
    }
  };

  // Agrupar reservas ocupadas por tipo
  const slotsPorTipo = slotsOcupados.reduce(
    (acc, slot) => {
      const tipo = slot.tipo || 'mesa';
      if (!acc[tipo]) acc[tipo] = [];
      acc[tipo].push(slot);
      return acc;
    },
    {} as Record<string, ReservaDetalle[]>
  );

  // Calcular slots libres por tipo
  const mesasLibres = slotsLibres.filter(
    s => !s.tipo || s.tipo.toLowerCase().includes('mesa') || s.tipo === 'm'
  ).length;
  const bicicletasLibres = slotsLibres.filter(
    s => s.tipo?.toLowerCase().includes('bicicleta') || s.tipo === 'b'
  ).length;

  return (
    <div
      className={`
        ${styles.timeSlot}
        ${hayDisponibilidad ? styles.timeSlotLibre : styles.timeSlotReservado}
        ${esPasado ? styles.timeSlotPasado : ''}
      `}
      onClick={handleClick}
      role={esClickeable ? 'button' : undefined}
      tabIndex={esClickeable ? 0 : undefined}
      title={esClickeable ? 'Hacer clic para crear reserva' : slotsOcupados.length > 0 ? 'Reservas (no hay disponibilidad)' : ''}
    >
      <div className={styles.timeSlotContent}>
        {slotsOcupados.length > 0 ? (
          // Mostrar reservas ocupadas
          <div className={styles.reservationList}>
            {Object.entries(slotsPorTipo).map(([tipo, reservas]) => {
              const colors = getTipoColor(tipo.toLowerCase());
              return reservas.map((slot, idx) => (
                <div
                  key={`${tipo}-${idx}`}
                  className={styles.reservationCard}
                  style={{
                    background: colors.bg,
                    borderColor: colors.border,
                  }}
                >
                  <div style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                    {slot.cliente && (
                      <span className={styles.reservationCliente} style={{ color: colors.accent, display: 'block' }}>
                        {slot.cliente}
                      </span>
                    )}
                    {slot.servicio && (
                      <span className={styles.reservationServicio} style={{ display: 'block', color: 'rgba(255, 255, 255, 0.8)' }}>
                        {extraerNombreServicio(slot.servicio)}
                      </span>
                    )}
                    <span className={styles.reservationTipo} style={{ color: colors.accent, display: 'block' }}>
                      {getTipoLabel(tipo.toLowerCase())}
                    </span>
                  </div>
                </div>
              ));
            })}
            {/* {hayDisponibilidad && (
              <SlotBadges mesas={mesasLibres} bicicletas={bicicletasLibres} />
            )} */}
          </div>
        ) : hayDisponibilidad ? (
          // Solo disponibles, mostrar "+"
          <div className={styles.freeSlot}>
            <span className={styles.freeIcon}>+</span>
          </div>
        ) : esPasado ? (
          <div className={styles.passedSlot}>
            <span className={styles.passedIcon}>—</span>
          </div>
        ) : (
          // Completamente ocupado
          <div className={styles.passedSlot}>
            <span className={styles.passedIcon}>—</span>
          </div>
        )}
      </div>
    </div>
  );
}
