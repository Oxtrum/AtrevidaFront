'use client';

import { useMemo } from 'react';
import { Banknote, Pencil, Trash2 } from 'lucide-react';
import { AdminButton, RowActionsMenu } from '@/components/AdminConfig';
import type { ReservaBD } from '@/types/reserva';
import {
  ReservaContacto,
  ReservaRow,
  ReservaStatusLine,
  formatDuracion,
  getReservaTone,
} from './ReservaRow';
import styles from './ReservasLista.module.css';

interface ReservasListaProps {
  reservas: ReservaBD[];
  loading?: boolean;
  error?: string | null;
  deletingId?: number | null;
  onSelect: (reserva: ReservaBD) => void;
  onEdit: (reserva: ReservaBD) => void;
  onDelete: (reserva: ReservaBD) => void;
}

function formatDia(fecha: string) {
  const d = new Date(`${fecha.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fecha;
  const label = d.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const esPorCobrar = (r: ReservaBD) => r.estado === 'COMPLETADO' && r.estado_cobro === 'POR_COBRAR';

const COBRO_NOTE: Record<string, { text: string; warn?: boolean }> = {
  POR_COBRAR: { text: 'Por cobrar', warn: true },
  COBRADA: { text: 'Cobrada' },
  CUBIERTA_PAQUETE: { text: 'Paquete' },
};

export function ReservasLista({ reservas, loading, error, deletingId, onSelect, onEdit, onDelete }: ReservasListaProps) {
  const grupos = useMemo(() => {
    const map = new Map<string, ReservaBD[]>();
    for (const r of reservas) {
      const key = (r.fecha ?? '').slice(0, 10);
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, items]) => ({
        fecha,
        items: items.slice().sort((a, b) => (a.hora_desde ?? '').localeCompare(b.hora_desde ?? '')),
      }));
  }, [reservas]);

  if (error) return <div className={styles.state} role="alert">{error}</div>;
  if (loading && reservas.length === 0) {
    return (
      <div className={styles.skeletons} aria-busy="true" aria-label="Cargando reservas">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className={styles.skeleton} />)}
      </div>
    );
  }
  if (reservas.length === 0) return <div className={styles.state}>No se encontraron reservas</div>;

  return (
    <div className={`${styles.lista} ${loading ? styles.refreshing : ''}`}>
      {grupos.map((grupo) => {
        const porCobrarCount = grupo.items.filter(esPorCobrar).length;
        return (
          <section key={grupo.fecha} className={styles.grupo}>
            <header className={styles.grupoHeader}>
              <h3>{formatDia(grupo.fecha)}</h3>
              <span>
                {grupo.items.length} {grupo.items.length === 1 ? 'reserva' : 'reservas'}
                {porCobrarCount > 0 && <b className={styles.grupoCobrar}>{porCobrarCount} por cobrar</b>}
              </span>
            </header>

            {grupo.items.map((r) => {
              const estado = r.estado || 'PENDIENTE';
              const completado = estado === 'COMPLETADO';
              const cobro = completado && r.estado_cobro ? COBRO_NOTE[r.estado_cobro] : undefined;

              return (
                <ReservaRow
                  key={r.id}
                  tone={getReservaTone(estado)}
                  highlight={esPorCobrar(r)}
                  time={r.hora_desde}
                  timeSub={formatDuracion(r.hora_desde, r.hora_hasta) || r.hora_hasta}
                  title={r.cliente || 'Cliente sin nombre'}
                  id={r.id}
                  service={r.servicio_confirmado || r.servicio || r.servicio_solicitado || 'Servicio por definir'}
                  meta={<ReservaContacto local={r.local} telefono={r.numero_telefono} />}
                  status={
                    <ReservaStatusLine
                      estado={estado}
                      stock={r.alerta_inventario === true && !completado}
                      notes={cobro ? [cobro] : []}
                    />
                  }
                  onClick={() => onSelect(r)}
                  actions={
                    <>
                      {esPorCobrar(r) && (
                        <AdminButton size="sm" icon={<Banknote size={14} strokeWidth={2} />} href={`/atrevida-gestion/caja?reserva=${r.id}`}>
                          Cobrar
                        </AdminButton>
                      )}
                      <RowActionsMenu
                        actions={[
                          ...(!completado
                            ? [{ label: 'Editar', icon: <Pencil size={12} strokeWidth={2} />, onClick: () => onEdit(r) }]
                            : []),
                          { label: 'Eliminar', icon: <Trash2 size={12} strokeWidth={2} />, onClick: () => onDelete(r), variant: 'danger' as const, disabled: deletingId === r.id },
                        ]}
                      />
                    </>
                  }
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
