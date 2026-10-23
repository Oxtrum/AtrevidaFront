'use client';

import { Plus, Trash2 } from 'lucide-react';
import { AdminButton } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { formatMoney } from '@/lib/utils/format';
import type { TipoBono } from '@/types/rrhh';
import styles from './BonosEditor.module.css';

/** Línea en edición: todo como texto, igual que el resto de formularios de RRHH. */
export interface BonoLineaForm {
  /** id del tipo como string; '' = sin elegir. */
  tipo: string;
  monto: string;
  nota: string;
}

export const bonoLineaVacia = (): BonoLineaForm => ({ tipo: '', monto: '', nota: '' });

/** Monto numérico de una línea; texto inválido o negativo cuenta como 0. */
export const montoLinea = (l: BonoLineaForm): number => {
  const n = Number(l.monto.replace(',', '.') || 0);
  return Number.isNaN(n) || n < 0 ? 0 : n;
};

interface BonosEditorProps {
  tipos: TipoBono[];
  lineas: BonoLineaForm[];
  moneda: string;
  onChange: (lineas: BonoLineaForm[]) => void;
}

/** Bonos de una planilla: cada línea indica de qué tipo del catálogo es, cuánto y por qué. */
export function BonosEditor({ tipos, lineas, moneda, onChange }: BonosEditorProps) {
  const setLinea = (i: number, patch: Partial<BonoLineaForm>) => onChange(lineas.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const total = lineas.reduce((acc, l) => acc + montoLinea(l), 0);
  const hayActivos = tipos.some((t) => t.activo);
  // Un tipo ya desactivado se sigue mostrando en la línea que lo usa, pero no se ofrece en las nuevas.
  const opciones = (actual: string) =>
    tipos.filter((t) => t.activo || String(t.id) === actual).map((t) => ({ value: String(t.id), label: t.activo ? t.nombre : `${t.nombre} (inactivo)` }));

  return (
    <div className={styles.root}>
      {lineas.length === 0 ? (
        <p className={styles.empty}>{hayActivos ? 'Sin bonos este mes.' : 'No hay tipos de bono. Créalos en la pestaña Bonos.'}</p>
      ) : (
        <>
          <div className={styles.head} aria-hidden>
            <span>Tipo</span>
            <span>Monto</span>
            <span>Detalle</span>
            <span />
          </div>
          {lineas.map((l, i) => (
            <div key={i} className={styles.line}>
              <CustomSelect value={l.tipo} onChange={(v) => setLinea(i, { tipo: v })} options={opciones(l.tipo)} placeholder="Elegir tipo…" />
              <input
                type="text"
                inputMode="decimal"
                className={`${styles.input} ${styles.monto}`}
                aria-label="Monto del bono"
                placeholder="0.00"
                value={l.monto}
                onChange={(e) => setLinea(i, { monto: e.target.value })}
              />
              <input
                type="text"
                className={styles.input}
                aria-label="Detalle del bono"
                placeholder="Opcional"
                value={l.nota}
                onChange={(e) => setLinea(i, { nota: e.target.value })}
              />
              <button type="button" className={styles.remove} aria-label="Quitar bono" onClick={() => onChange(lineas.filter((_, idx) => idx !== i))}>
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>
          ))}
        </>
      )}
      <div className={styles.footer}>
        <AdminButton variant="secondary" onClick={() => onChange([...lineas, bonoLineaVacia()])} icon={<Plus size={16} strokeWidth={2} />} disabled={!hayActivos}>
          Agregar bono
        </AdminButton>
        {lineas.length > 0 && (
          <span className={styles.total}>
            Total bonos <strong>{formatMoney(total, moneda)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
