'use client';

import { useMemo, useState } from 'react';
import { AlertBanner, FormModal, StatusBadge, formatMes } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import {
  cambiarEstadoMovimientoFinanciero,
  generarGastosFijos,
  getMovimientosFinancieros,
} from '@/lib/api/finanzas';
import { formatDateISO, formatMoney } from '@/lib/utils/format';
import type { GastoFijoPendiente, MovimientoFinanciero } from '@/types/finanzas';
import styles from './PagarEgresosFijosModal.module.css';

interface PagarEgresosFijosModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Egresos fijos ya registrados que siguen en estado PENDIENTE. */
  registrados: MovimientoFinanciero[];
  /** Egresos fijos vencidos que todavía no se registraron. */
  sinRegistrar: GastoFijoPendiente[];
  moneda: string;
  onPaid: () => void;
}

interface Item {
  key: string;
  nombre: string;
  /** YYYY-MM */
  periodo: string;
  local: string;
  fecha: string;
  monto: number;
  movimientoId?: number;
  gastoFijoId?: number;
}

const periodoDe = (valor?: string | null) => (valor ?? '').slice(0, 7);

/**
 * Lista los egresos fijos por pagar (ya registrados + vencidos sin registrar) y paga los marcados.
 * Los vencidos sin registrar se generan primero (la generación es idempotente) y luego se marcan pagados.
 */
export function PagarEgresosFijosModal({ isOpen, onClose, registrados, sinRegistrar, moneda, onPaid }: PagarEgresosFijosModalProps) {
  const items = useMemo<Item[]>(() => [
    ...registrados.map((m) => ({
      key: `mov-${m.id}`,
      nombre: m.descripcion || m.categoria_nombre,
      periodo: periodoDe(m.periodo ?? m.fecha),
      local: m.local_nombre || 'General',
      fecha: m.fecha,
      monto: m.monto,
      movimientoId: m.id,
      gastoFijoId: m.gasto_fijo_id ?? undefined,
    })),
    ...sinRegistrar.map((p) => ({
      key: `gf-${p.gasto_fijo_id}-${p.periodo}`,
      nombre: p.nombre,
      periodo: periodoDe(p.periodo),
      local: p.local_nombre || 'General',
      fecha: p.fecha_cobro,
      monto: p.monto,
      gastoFijoId: p.gasto_fijo_id,
    })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha)), [registrados, sinRegistrar]);

  // Por defecto todo marcado; `omitidos` guarda lo que la persona desmarcó.
  const [omitidos, setOmitidos] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const seleccionados = items.filter((i) => !omitidos.has(i.key));
  const total = seleccionados.reduce((acc, i) => acc + i.monto, 0);

  const toggle = (key: string) => setOmitidos((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  const handlePagar = async () => {
    if (seleccionados.length === 0) return;
    setSaving(true);
    try {
      const ids = new Set(seleccionados.flatMap((i) => (i.movimientoId ? [i.movimientoId] : [])));
      const porRegistrar = seleccionados.filter((i) => !i.movimientoId);

      if (porRegistrar.length > 0) {
        await generarGastosFijos();
        const frescos = await getMovimientosFinancieros({ clase: 'FIJO', estado: 'PENDIENTE' });
        porRegistrar.forEach((i) => {
          const mov = frescos.find((m) => m.gasto_fijo_id === i.gastoFijoId && periodoDe(m.periodo ?? m.fecha) === i.periodo);
          if (mov) ids.add(mov.id);
        });
      }

      for (const id of ids) await cambiarEstadoMovimientoFinanciero(id, 'PAGADO');
      toast.success(`${seleccionados.length} egreso${seleccionados.length === 1 ? '' : 's'} fijo${seleccionados.length === 1 ? '' : 's'} pagado${seleccionados.length === 1 ? '' : 's'}`);
      onPaid();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron pagar los egresos fijos');
      onPaid();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pagar egresos fijos"
      size="lg"
      onSubmit={handlePagar}
      loading={saving}
      submitDisabled={seleccionados.length === 0}
      submitLabel={seleccionados.length === 0 ? 'Pagar' : `Pagar ${seleccionados.length} · ${formatMoney(total, moneda)}`}
      hideFooter={items.length === 0}
    >
      {items.length === 0 ? (
        <AlertBanner tone="info" title="No hay egresos fijos por pagar">
          Todos los egresos fijos vencidos ya están pagados. Los próximos aparecerán aquí cuando venzan.
        </AlertBanner>
      ) : (
        <>
          <p className={styles.lead}>Marca los egresos fijos que quieres pagar ahora. Se registran como pagados.</p>
          <ul className={styles.list}>
            {items.map((i) => (
              <li key={i.key}>
                <label className={styles.row}>
                  <input type="checkbox" checked={!omitidos.has(i.key)} onChange={() => toggle(i.key)} />
                  <span className={styles.info}>
                    <strong>{i.nombre}</strong>
                    <small>{formatMes(i.periodo)} · {i.local} · vence {formatDateISO(i.fecha)}</small>
                  </span>
                  {!i.movimientoId && <StatusBadge tone="neutral">Sin registrar</StatusBadge>}
                  <span className={styles.monto}>{formatMoney(i.monto, moneda)}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </FormModal>
  );
}
