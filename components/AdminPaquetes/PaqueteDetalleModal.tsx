'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from '@/components/Shared/Toast';
import { getPlanByID, marcarSesionPlan, type PlanDetalle, type PlanItem, type PlanServicioDetalle } from '@/lib/api/planes';
import styles from './PaquetesActivos.module.css';

interface PaqueteDetalleModalProps {
  plan: Pick<PlanItem, 'id' | 'combo_nombre_texto' | 'cliente'>;
  onClose: () => void;
  /** Se marco o desmarco una sesion: quien lista el paquete debe recargar su avance. */
  onCambio: () => void;
}

/** Detalle de un paquete: progreso, servicios incluidos y sus sesiones, que se pueden marcar a mano. */
export function PaqueteDetalleModal({ plan, onClose, onCambio }: PaqueteDetalleModalProps) {
  const [detalle, setDetalle] = useState<PlanDetalle | null>(null);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await getPlanByID(plan.id);
      setDetalle(res?.data?.plan ?? null);
    } catch {
      toast.error('No se pudo cargar el detalle del plan.');
      setDetalle(null);
    } finally {
      setCargando(false);
    }
  }, [plan.id]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const sesiones = useMemo(() => {
    const map = new Map<number, PlanServicioDetalle[]>();
    for (const s of detalle?.servicios ?? []) {
      const arr = map.get(s.sesion_numero) ?? [];
      arr.push(s);
      map.set(s.sesion_numero, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
      .map(([numero, servs]) => ({ numero, servicios: servs, hecha: servs.every((x) => x.realizado), fecha: servs.find((x) => x.fecha_realizado)?.fecha_realizado }));
  }, [detalle]);
  const hechas = sesiones.filter((s) => s.hecha).length;

  // Servicios incluidos (unicos): se entregan en cada sesion, se listan una vez.
  const serviciosIncluidos = useMemo(() => {
    const vistos = new Set<string>();
    const out: string[] = [];
    for (const s of detalle?.servicios ?? []) {
      const label = (s.nombre_texto ?? '').trim();
      if (!label) continue;
      const clave = label.toLowerCase();
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      out.push(label);
    }
    return out;
  }, [detalle]);

  const marcar = async (numero: number, realizado: boolean) => {
    try {
      await marcarSesionPlan(plan.id, numero, realizado);
      await recargar();
      onCambio();
      toast.success(realizado ? 'Sesión marcada' : 'Sesión pendiente');
    } catch {
      toast.error('No se pudo actualizar la sesión');
    }
  };

  return (
    <div className={styles.detalleOverlay} onClick={onClose}>
      <div className={styles.detalleModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.detalleHeader}>
          <div>
            <h3 className={styles.detalleTitle}>{plan.combo_nombre_texto ?? 'Plan'}</h3>
            <p className={styles.detalleSubtitle}>{plan.cliente}</p>
          </div>
          <button type="button" className={styles.cerrarBtn} onClick={onClose} aria-label="Cerrar detalle del plan">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {cargando && !detalle ? (
          <p className={styles.detalleLoading}>Cargando sesiones...</p>
        ) : sesiones.length === 0 ? (
          <p className={styles.detalleLoading}>Este plan no tiene sesiones registradas.</p>
        ) : (
          <>
            <div className={styles.progresoWrap}>
              <div className={styles.progresoTop}>
                <span>Progreso del paquete</span>
                <strong>{hechas}/{sesiones.length} sesiones</strong>
              </div>
              <div className={styles.progresoBar}>
                <div className={styles.progresoFill} style={{ width: `${sesiones.length ? Math.round((hechas / sesiones.length) * 100) : 0}%` }} />
              </div>
            </div>
            {serviciosIncluidos.length > 0 && (
              <div className={styles.serviciosIncluidos}>
                <span className={styles.serviciosIncluidosLabel}>Servicios incluidos</span>
                <ul className={styles.serviciosIncluidosList}>
                  {serviciosIncluidos.map((label, i) => <li key={i}>{label}</li>)}
                </ul>
              </div>
            )}
            {sesiones.map((s) => (
              <div key={s.numero} className={`${styles.sesionRow} ${s.hecha ? styles.sesionHecha : ''}`}>
                <span className={styles.sesionNum}>Sesión {s.numero}{s.hecha && s.fecha ? ` · ${s.fecha.slice(0, 10)}` : ''}</span>
                <button type="button" className={styles.toggleBtn} onClick={() => marcar(s.numero, !s.hecha)}>
                  {s.hecha ? '✓ Hecha' : 'Marcar hecha'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
