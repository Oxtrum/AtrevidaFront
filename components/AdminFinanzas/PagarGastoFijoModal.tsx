'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChoiceChips, FormField, FormModal, FormSubmitError } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import {
  cambiarEstadoMovimientoFinanciero,
  getGastosFijosPendientes,
  getMovimientosFinancieros,
  pagarGastosFijos,
} from '@/lib/api/finanzas';
import { formatDateISO, formatMoney, todayISO } from '@/lib/utils/format';
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

type ModoAdelanto = 'cantidad' | 'fecha';

const MODOS_ADELANTO: { value: ModoAdelanto; label: string }[] = [
  { value: 'cantidad', label: 'Por cantidad' },
  { value: 'fecha', label: 'Hasta una fecha' },
];

/** Fecha local YYYY-MM-DD desplazada `dias` días. */
function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1, d + dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const aEntero = (texto: string) => Math.max(0, parseInt(texto, 10) || 0);

/**
 * Paga los pagos atrasados de UN gasto fijo y/o adelanta los siguientes. Los pagos atrasados se pagan primero
 * (los más antiguos) y solo con todos al día se habilita adelantar. Muestra qué se va a pagar y el total.
 */
export function PagarGastoFijoModal({ isOpen, gasto, moneda, onClose, onPaid }: PagarGastoFijoModalProps) {
  const hoy = todayISO();
  const [vencidos, setVencidos] = useState<Pago[]>([]);
  const [futuros, setFuturos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Texto para poder borrar y reescribir. Pendientes: null = todos.
  const [cantidadVencidos, setCantidadVencidos] = useState<string | null>(null);
  const [modoAdelanto, setModoAdelanto] = useState<ModoAdelanto>('cantidad');
  const [cantidadAdelanto, setCantidadAdelanto] = useState('0');
  const [hasta, setHasta] = useState('');

  useEffect(() => {
    if (!isOpen || !gasto) return;
    let activo = true;
    setLoading(true);
    setError('');
    setCantidadVencidos(null);
    setModoAdelanto('cantidad');
    setCantidadAdelanto('0');
    setHasta(sumarDias(hoy, 30));
    setFuturos([]);
    Promise.all([
      getGastosFijosPendientes({ gasto_fijo_id: gasto.id }),
      getMovimientosFinancieros({ clase: 'FIJO', estado: 'PENDIENTE' }),
    ])
      .then(([sinCrear, registrados]) => {
        if (!activo) return;
        const porCrear: Pago[] = sinCrear.map((p) => ({ key: `gf-${p.fecha_cobro}`, fecha: p.fecha_cobro, monto: p.monto, adelantado: false }));
        const yaRegistrados: Pago[] = registrados
          .filter((m) => m.gasto_fijo_id === gasto.id)
          .map((m) => ({ key: `mov-${m.id}`, fecha: m.fecha, monto: m.monto, adelantado: false, movimientoId: m.id }));
        setVencidos([...yaRegistrados, ...porCrear].sort((a, b) => a.fecha.localeCompare(b.fecha)));
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
  }, [isOpen, gasto, hoy]);

  const nVencidos = cantidadVencidos === null ? vencidos.length : Math.min(vencidos.length, aEntero(cantidadVencidos));
  const vencidosElegidos = useMemo(() => vencidos.slice(0, nVencidos), [vencidos, nVencidos]);
  // Adelantar solo con todo lo atrasado al día: sin pendientes, o pagándolos todos ahora.
  const puedeAdelantar = nVencidos === vencidos.length;
  const nAdelanto = aEntero(cantidadAdelanto);
  const pideFuturos = puedeAdelantar && (modoAdelanto === 'cantidad' ? nAdelanto > 0 : !!hasta);

  // Los pagos futuros se piden al servidor según lo elegido (cuántos o hasta qué fecha), sin tope artificial.
  useEffect(() => {
    if (!isOpen || !gasto || !pideFuturos) {
      setFuturos([]);
      return;
    }
    let activo = true;
    const opts = modoAdelanto === 'fecha' ? { hasta, gasto_fijo_id: gasto.id } : { adelantar: nAdelanto, gasto_fijo_id: gasto.id };
    getGastosFijosPendientes(opts)
      .then((lista) => {
        if (!activo) return;
        setFuturos(
          lista
            .filter((p) => p.adelantado)
            .map((p) => ({ key: `gf-${p.fecha_cobro}`, fecha: p.fecha_cobro, monto: p.monto, adelantado: true }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha)),
        );
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudieron cargar los pagos futuros');
      });
    return () => {
      activo = false;
    };
  }, [isOpen, gasto, pideFuturos, modoAdelanto, nAdelanto, hasta]);

  const adelantados = useMemo(() => (pideFuturos ? futuros : []), [pideFuturos, futuros]);
  const seleccion = useMemo(() => [...vencidosElegidos, ...adelantados], [vencidosElegidos, adelantados]);
  const total = seleccion.reduce((acc, p) => acc + p.monto, 0);
  const faltanFuturos = pideFuturos && modoAdelanto === 'cantidad' && futuros.length < nAdelanto;
  const sinFuturosHasta = pideFuturos && modoAdelanto === 'fecha' && futuros.length === 0;

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
          </dl>
        </div>

        {loading && <p className={styles.hint}>Cargando pagos…</p>}

        {!loading && (
          <>
            <div className={styles.controls}>
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h4 className={styles.sectionTitle}>Pagos pendientes</h4>
              </div>
              <div>
                <FormField
                  label={vencidos.length === 0 ? 'Cuántos pagos pendientes pagar' : `Cuántos pagos pendientes pagar (de ${vencidos.length})`}
                  htmlFor="pgf-cantidad"
                  hint={vencidos.length === 0 ? 'No hay pagos pendientes: este gasto está al día.' : 'Se pagan primero los más antiguos.'}
                >
                  <input
                    id="pgf-cantidad"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={vencidos.length}
                    disabled={vencidos.length === 0}
                    value={vencidos.length === 0 ? '0' : (cantidadVencidos ?? String(vencidos.length))}
                    onChange={(e) => setCantidadVencidos(e.target.value)}
                    onBlur={() => setCantidadVencidos(String(nVencidos))}
                  />
                </FormField>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h4 className={styles.sectionTitle}>Adelantar pagos</h4>
                <ChoiceChips variant="toggle" options={MODOS_ADELANTO} value={modoAdelanto} onChange={setModoAdelanto} ariaLabel="Cómo elegir los pagos a adelantar" />
              </div>
              <div>
                {modoAdelanto === 'cantidad' ? (
                  <FormField
                    label="Cuántos pagos adelantar"
                    htmlFor="pgf-adelanto"
                    hint={puedeAdelantar ? undefined : `Para adelantar, primero paga todos los pagos pendientes (escribe ${vencidos.length} arriba).`}
                  >
                    <input
                      id="pgf-adelanto"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      disabled={!puedeAdelantar}
                      value={cantidadAdelanto}
                      onChange={(e) => setCantidadAdelanto(e.target.value)}
                      onBlur={() => setCantidadAdelanto(String(nAdelanto))}
                    />
                  </FormField>
                ) : (
                  <FormField
                    label="Adelantar hasta el"
                    htmlFor="pgf-hasta"
                    hint={puedeAdelantar ? 'Incluye los pagos con fecha hasta ese día.' : `Para adelantar, primero paga todos los pagos pendientes (escribe ${vencidos.length} arriba).`}
                  >
                    <input id="pgf-hasta" type="date" disabled={!puedeAdelantar} value={hasta} min={sumarDias(hoy, 1)} onChange={(e) => setHasta(e.target.value)} />
                  </FormField>
                )}
              </div>
              {faltanFuturos && (
                <p className={styles.hint}>Este gasto solo tiene {plural(futuros.length, 'pago futuro', 'pagos futuros')} dentro de su vigencia.</p>
              )}
              {sinFuturosHasta && <p className={styles.hint}>No hay pagos hasta esa fecha dentro de la vigencia del gasto.</p>}
            </div>
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
