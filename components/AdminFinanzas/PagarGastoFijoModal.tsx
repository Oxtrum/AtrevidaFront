'use client';

import { useEffect, useMemo, useState } from 'react';
import { FormField, FormModal, FormSubmitError } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import {
  cambiarEstadoMovimientoFinanciero,
  getGastosFijosPendientes,
  getMovimientosFinancieros,
  pagarGastosFijos,
} from '@/lib/api/finanzas';
import { formatDateISO, formatMoney } from '@/lib/utils/format';
import { frecuenciaLabel, type GastoFijo } from '@/types/finanzas';
import { EstadoMovimientoBadge } from './EstadoMovimientoBadge';
import styles from './PagarGastoFijoModal.module.css';

interface PagarGastoFijoModalProps {
  isOpen: boolean;
  gasto: GastoFijo | null;
  moneda: string;
  onClose: () => void;
  onPaid: () => void;
}

/** Un pago concreto del gasto: ya existe como egreso pendiente (movimientoId) o aún hay que crearlo. */
interface Pago {
  key: string;
  fecha: string;
  monto: number;
  adelantado: boolean;
  movimientoId?: number;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const aEntero = (texto: string) => Math.max(0, parseInt(texto, 10) || 0);

/**
 * Paga UN gasto fijo con un solo número: los primeros pagos cubren lo atrasado (los más antiguos) y lo que sobre se
 * adelanta a continuación del último pago cubierto. Por defecto propone pagar todo lo pendiente.
 */
export function PagarGastoFijoModal({ isOpen, gasto, moneda, onClose, onPaid }: PagarGastoFijoModalProps) {
  const [vencidos, setVencidos] = useState<Pago[]>([]);
  const [futuros, setFuturos] = useState<Pago[]>([]);
  // Cuántos pagos más se pueden adelantar dentro de la vigencia; null = sin tope (gasto sin fecha de fin).
  const [maxAdelanto, setMaxAdelanto] = useState<number | null>(null);
  // Fecha del último cobro que el gasto llega a generar (por su fecha de fin); null = sin fin.
  const [ultimoPago, setUltimoPago] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Texto para poder borrar y reescribir. null = tantos como pendientes.
  const [cantidad, setCantidad] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !gasto) return;
    let activo = true;
    setLoading(true);
    setError('');
    setCantidad(null);
    setFuturos([]);
    setMaxAdelanto(null);
    setUltimoPago(null);
    Promise.all([
      getGastosFijosPendientes({ gasto_fijo_id: gasto.id }),
      getMovimientosFinancieros({ clase: 'FIJO', estado: 'PENDIENTE' }),
      gasto.fecha_fin ? getGastosFijosPendientes({ hasta: gasto.fecha_fin, gasto_fijo_id: gasto.id }) : Promise.resolve(null),
    ])
      .then(([sinCrear, registrados, adelantables]) => {
        if (!activo) return;
        const porCrear: Pago[] = sinCrear.map((p) => ({ key: `gf-${p.fecha_cobro}`, fecha: p.fecha_cobro, monto: p.monto, adelantado: false }));
        const yaRegistrados: Pago[] = registrados
          .filter((m) => m.gasto_fijo_id === gasto.id)
          .map((m) => ({ key: `mov-${m.id}`, fecha: m.fecha, monto: m.monto, adelantado: false, movimientoId: m.id }));
        const atrasados = [...yaRegistrados, ...porCrear].sort((a, b) => a.fecha.localeCompare(b.fecha));
        setVencidos(atrasados);
        // Un pendiente que aún no vence también puede venir como "adelantable": ya cuenta como pendiente, no se repite.
        const fechasPendientes = new Set(atrasados.map((p) => p.fecha.slice(0, 10)));
        const futurosVigentes = adelantables ? adelantables.filter((p) => p.adelantado && !fechasPendientes.has(p.fecha_cobro.slice(0, 10))) : null;
        setMaxAdelanto(futurosVigentes ? futurosVigentes.length : null);
        if (futurosVigentes) {
          const fechas = [...futurosVigentes.map((p) => p.fecha_cobro.slice(0, 10)), ...(gasto.pagado_hasta ? [gasto.pagado_hasta.slice(0, 10)] : [])].sort();
          setUltimoPago(fechas[fechas.length - 1] ?? null);
        }
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudieron cargar los pagos');
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
  }, [isOpen, gasto]);

  const maxTotal = maxAdelanto === null ? null : vencidos.length + maxAdelanto;
  const pedido = cantidad === null ? vencidos.length : aEntero(cantidad);
  const nTotal = maxTotal === null ? pedido : Math.min(maxTotal, pedido);
  // Los primeros cubren lo atrasado; el resto se adelanta.
  const nVencidos = Math.min(vencidos.length, nTotal);
  const nAdelanto = nTotal - nVencidos;
  const vencidosElegidos = useMemo(() => vencidos.slice(0, nVencidos), [vencidos, nVencidos]);
  const pideFuturos = nAdelanto > 0;

  // Los pagos a adelantar se piden al servidor: los siguientes al último cubierto, sin tope artificial.
  useEffect(() => {
    if (!isOpen || !gasto || !pideFuturos) {
      setFuturos([]);
      return;
    }
    let activo = true;
    const fechasPendientes = new Set(vencidos.map((p) => p.fecha.slice(0, 10)));
    getGastosFijosPendientes({ adelantar: nAdelanto, gasto_fijo_id: gasto.id })
      .then((lista) => {
        if (!activo) return;
        setFuturos(
          lista
            .filter((p) => p.adelantado && !fechasPendientes.has(p.fecha_cobro.slice(0, 10)))
            .map((p) => ({ key: `gf-${p.fecha_cobro}`, fecha: p.fecha_cobro, monto: p.monto, adelantado: true }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha))
            .slice(0, nAdelanto),
        );
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudieron cargar los pagos futuros');
      });
    return () => {
      activo = false;
    };
  }, [isOpen, gasto, pideFuturos, nAdelanto, vencidos]);

  const adelantados = useMemo(() => (pideFuturos ? futuros : []), [pideFuturos, futuros]);
  const seleccion = useMemo(() => [...vencidosElegidos, ...adelantados], [vencidosElegidos, adelantados]);
  const total = seleccion.reduce((acc, p) => acc + p.monto, 0);

  const tope = maxTotal === null ? '' : ` Máximo ${maxTotal}${ultimoPago ? `: el último pago es el ${formatDateISO(ultimoPago)}` : ''}.`;
  const hint =
    maxTotal === 0
      ? 'Este gasto ya está cubierto hasta el final de su vigencia: no queda nada por pagar.'
      : vencidos.length > 0
        ? `${plural(vencidos.length, 'pendiente', 'pendientes')}: se pagan primero. Si pones más, el resto se adelanta.${tope}`
        : `Está al día: cada pago que pongas es un adelanto${gasto?.proximo_cobro ? `, desde el ${formatDateISO(gasto.proximo_cobro)}` : ''}.${tope}`;

  const handlePagar = async () => {
    if (!gasto || seleccion.length === 0) return;
    setSaving(true);
    setError('');
    try {
      // Primero lo que ya existe como egreso pendiente y luego lo que se crea: el servidor exige los atrasados al día.
      for (const p of seleccion) {
        if (p.movimientoId) await cambiarEstadoMovimientoFinanciero(p.movimientoId, 'PAGADO');
      }
      const porCrear = seleccion.filter((p) => !p.movimientoId);
      if (porCrear.length > 0) {
        await pagarGastosFijos(porCrear.map((p) => ({ gasto_fijo_id: gasto.id, fecha_cobro: p.fecha })));
      }
      toast.success(`${plural(seleccion.length, 'pago registrado', 'pagos registrados')} · ${formatMoney(total, moneda)}`);
      onPaid();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
      onPaid();
    } finally {
      setSaving(false);
    }
  };

  if (!gasto) return null;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Pagar o adelantar gasto fijo"
      size="lg"
      onSubmit={handlePagar}
      loading={saving}
      submitDisabled={loading || seleccion.length === 0}
      submitLabel={seleccion.length === 0 ? 'Pagar' : `Pagar ${plural(seleccion.length, 'pago', 'pagos')} · ${formatMoney(total, moneda)}`}
    >
      <div className={styles.body}>
        <div className={styles.summary}>
          <h3 className={styles.name}>{gasto.nombre}</h3>
          <p className={styles.meta}>
            {frecuenciaLabel(gasto.frecuencia)} · {formatMoney(gasto.monto, moneda)} cada pago · {gasto.local_nombre || 'General'}
          </p>
          <dl className={styles.facts}>
            <div className={styles.fact}><dt>Pagado hasta</dt><dd>{gasto.pagado_hasta ? formatDateISO(gasto.pagado_hasta) : 'Sin pagos'}</dd></div>
            <div className={styles.fact}><dt>Siguiente pago</dt><dd>{gasto.proximo_cobro ? formatDateISO(gasto.proximo_cobro) : '—'}</dd></div>
            <div className={styles.fact} title={gasto.fecha_fin ? `El gasto termina el ${formatDateISO(gasto.fecha_fin)}: no genera más cobros` : 'El gasto no tiene fecha de fin'}>
              <dt>Último pago</dt><dd>{gasto.fecha_fin ? (ultimoPago ? formatDateISO(ultimoPago) : '—') : 'Sin fin'}</dd>
            </div>
          </dl>
        </div>

        {loading && <p className={styles.hint}>Cargando pagos…</p>}

        {!loading && (
          <>
            <div className={styles.controls}>
              <FormField label="Cuántos pagos pagar" htmlFor="pgf-cantidad" hint={hint}>
                <input
                  id="pgf-cantidad"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={maxTotal ?? undefined}
                  disabled={maxTotal === 0}
                  value={maxTotal === 0 ? '0' : (cantidad ?? String(vencidos.length))}
                  onChange={(e) => setCantidad(e.target.value)}
                  onBlur={() => setCantidad(String(nTotal))}
                />
              </FormField>
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Se pagará</h4>
              {seleccion.length === 0 ? (
                <p className={styles.empty}>Todavía no elegiste ningún pago.</p>
              ) : (
                <div className={styles.previewBox}>
                  <ul className={styles.preview}>
                    {seleccion.map((p) => (
                      <li key={p.key} className={styles.line}>
                        <span className={styles.date}>{formatDateISO(p.fecha)}</span>
                        <EstadoMovimientoBadge estado="PENDIENTE" fecha={p.fecha} adelantado={p.adelantado} />
                        <span className={styles.amount}>{formatMoney(p.monto, moneda)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.total}>
                    <span>Total a pagar · {plural(seleccion.length, 'pago', 'pagos')}</span>
                    <strong>{formatMoney(total, moneda)}</strong>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <FormSubmitError message={error} />
      </div>
    </FormModal>
  );
}
