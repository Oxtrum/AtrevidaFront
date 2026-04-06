'use client';

import { TimeSlotInfo, getTipoColor, getTipoLabel, normalizeTipo } from '@/types/reserva';
import styles from './Calendar.module.css';

interface TimeSlotProps {
  slot: TimeSlotInfo;
  onSlotClick?: (slot: TimeSlotInfo) => void;
  esPasado?: boolean;
}



function agruparReservas(reservas: TimeSlotInfo['reservas']) {
  const grupos: { tipo: string; clientes: string[]; servicio?: string; esFeriado: boolean }[] = [];

  for (const r of reservas) {
    const tipoNormalized = normalizeTipo(r.tipo);
    const esFeriado = r.esFeriado || tipoNormalized === 'feriado';

    if (esFeriado) {
      grupos.push({ tipo: 'feriado', clientes: [], esFeriado: true });
      continue;
    }

    const existente = grupos.find(g => g.tipo === tipoNormalized && !g.esFeriado);
    if (existente) {
      if (r.cliente) existente.clientes.push(r.cliente);
      if (r.servicio && !existente.servicio) existente.servicio = r.servicio;
    } else {
      grupos.push({
        tipo: tipoNormalized,
        clientes: r.cliente ? [r.cliente] : [],
        servicio: r.servicio,
        esFeriado: false,
      });
    }
  }

  return grupos;
}
export default function TimeSlot({ slot, onSlotClick, esPasado = false }: TimeSlotProps) {
  const handleClick = () => {
    if (esPasado || slot.esPasado) return;
    if (!slot.reservado && onSlotClick) {
      onSlotClick(slot);
    }
  };

  const grupos = agruparReservas(slot.reservas);
  const tieneFeriado = grupos.some(g => g.esFeriado);
  const tieneReservasReales = grupos.some(g => !g.esFeriado); // ← nuevo
  const esClickeable = !esPasado && !slot.esPasado && !tieneFeriado && !tieneReservasReales;

  return (
    <div
      className={`
    ${styles.timeSlot}
    ${tieneReservasReales || tieneFeriado ? styles.timeSlotReservado : styles.timeSlotLibre}
    ${esPasado || slot.esPasado ? styles.timeSlotPasado : ''}
    ${tieneFeriado ? styles.timeSlotFeriado : ''}
  `}
      onClick={esClickeable ? handleClick : undefined}
      role={esClickeable ? 'button' : undefined}
      tabIndex={esClickeable ? 0 : undefined}
      title={esClickeable ? 'Hacer clic para crear reserva' : undefined}
    >
      <div className={styles.timeSlotContent}>
        {slot.reservado ? (
          <div className={styles.reservationList}>
            {grupos.map((grupo, idx) => {
              const colors = getTipoColor(grupo.tipo);
              const label = getTipoLabel(grupo.tipo);

              if (grupo.esFeriado) {
                return (
                  <div
                    key={idx}
                    className={styles.reservationCard}
                    style={{
                      background: colors.bg,
                      borderColor: colors.border,
                    }}
                  >
                    <span
                      className={styles.reservationTipo}
                      style={{ color: colors.accent }}
                    >
                      {label}
                    </span>
                    <span className={styles.reservationCliente}>
                      No disponible
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={styles.reservationCard}
                  style={{
                    background: colors.bg,
                    borderColor: colors.border,
                  }}
                >
                  <span
                    className={styles.reservationTipo}
                    style={{ color: colors.accent }}
                  >
                    {label}
                  </span>
                  {grupo.clientes.length > 0 && (
                    <span className={styles.reservationCliente}>
                      {grupo.clientes[0]}
                      {grupo.clientes.length > 1 && (
                        <span className={styles.reservationCount}>
                          +{grupo.clientes.length - 1}
                        </span>
                      )}
                    </span>
                  )}
                  {grupo.servicio && (
                    <span className={styles.reservationServicio}>
                      {grupo.servicio}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : esPasado || slot.esPasado ? (
          <div className={styles.passedSlot}>
            <span className={styles.passedIcon}>—</span>
          </div>
        ) : (
          <div className={styles.freeSlot}>
            <span className={styles.freeIcon}>+</span>
          </div>
        )}
      </div>
    </div>
  );
}
