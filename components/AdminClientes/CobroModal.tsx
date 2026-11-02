'use client';

import { useEffect, useMemo, useState } from 'react';
import { FechaHechoField, FormField, FormModal, FormSubmitError, LocalSelect, TipoPagoSelector } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { cobrarCliente, type CargoCliente, type CuentaCliente } from '@/lib/api/cuenta';
import { useLocales } from '@/lib/hooks/useLocales';
import { getStoredAdminWorkplace } from '@/lib/auth/adminSession';
import { cargosCobrables, faltaParaPagar, planearCobro, totalMarcado } from '@/lib/utils/cobro';
import { ETIQUETA_DISPONIBLE, parseMonto, tipoCargoTexto } from '@/lib/utils/cuenta';
import { formatFecha } from '@/lib/utils/formatDateTime';
import { formatMoney } from '@/lib/utils/format';
import type { TipoPago } from '@/lib/utils/tipoPago';
import styles from './CobroModal.module.css';

interface CobroModalProps {
  isOpen: boolean;
  clienteId: number;
  nombre: string;
  cuenta: CuentaCliente | null;
  /** Cargos que ya vienen marcados (p. ej. al cobrar desde un cargo concreto). */
  preseleccionados?: number[];
  onClose: () => void;
  onCobrado: () => void;
}

/**
 * Cobro de caja de un cliente. El cajero marca los cargos que se pagan (completos, sin pagos parciales), se usa
 * primero el saldo disponible si el cliente quiere, y lo que falta se paga con un metodo. Una recarga opcional
 * queda como saldo disponible para despues.
 */
export function CobroModal({ isOpen, clienteId, nombre, cuenta, preseleccionados, onClose, onCobrado }: CobroModalProps) {
  const { locales } = useLocales();
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const [usarSaldo, setUsarSaldo] = useState(true);
  const [recarga, setRecarga] = useState('');
  const [tipoPago, setTipoPago] = useState<TipoPago>('efectivo');
  const [localId, setLocalId] = useState('');
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cobrables: CargoCliente[] = useMemo(() => cargosCobrables(cuenta?.cargos ?? []), [cuenta]);
  const disponible = cuenta?.saldo.disponible ?? 0;

  // Al abrir se parte de cero. Con un solo cargo pendiente ya viene marcado: es lo unico que se puede cobrar.
  useEffect(() => {
    if (!isOpen) return;
    const iniciales = preseleccionados?.length ? preseleccionados : cobrables.length === 1 ? [cobrables[0].id] : [];
    setMarcados(new Set(iniciales));
    setUsarSaldo(true);
    setRecarga('');
    setTipoPago('efectivo');
    setFecha('');
    setError('');
    // cobrables y preseleccionados se leen al abrir; recalcularlos no debe borrar lo que el cajero ya marco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Local: el del usuario si esta limitado a uno; si solo existe un local, ese.
  useEffect(() => {
    if (!isOpen || localId) return;
    const propio = getStoredAdminWorkplace()?.local_id;
    if (propio) setLocalId(String(propio));
    else if (locales.length === 1) setLocalId(String(locales[0].id));
  }, [isOpen, localId, locales]);

  const recargaNumero = recarga.trim() === '' ? 0 : parseMonto(recarga);
  const total = totalMarcado(cobrables, marcados);
  const plan = planearCobro(total, disponible, usarSaldo, recargaNumero ?? 0);
  const local = locales.find((l) => String(l.id) === localId);

  const alternar = (id: number) => {
    setMarcados((previos) => {
      const siguientes = new Set(previos);
      if (siguientes.has(id)) siguientes.delete(id);
      else siguientes.add(id);
      return siguientes;
    });
    setError('');
  };

  const nadaQueCobrar = marcados.size === 0 && (recargaNumero ?? 0) <= 0;

  const cobrar = async () => {
    if (recargaNumero === null) {
      setError('La recarga no es un monto válido');
      return;
    }
    if (!local) {
      setError('Elige el local donde se recibe el cobro');
      return;
    }
    if (nadaQueCobrar) {
      setError('Marca al menos un cargo o indica una recarga');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await cobrarCliente(clienteId, {
        local_id: local.id,
        local_nombre: local.nombre,
        cargo_ids: [...marcados],
        usar_saldo: usarSaldo,
        recarga: recargaNumero > 0 ? recargaNumero : undefined,
        tipo_pago: plan.requiereMetodo ? tipoPago : undefined,
        fecha_hecho: fecha || undefined,
      });
      toast.success('Cobro registrado');
      onCobrado();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el cobro');
    } finally {
      setGuardando(false);
    }
  };

  const etiquetaBoton = plan.requiereMetodo
    ? `Cobrar ${formatMoney(plan.nuevoPago)}`
    : marcados.size > 0 ? 'Cobrar con saldo disponible' : 'Cobrar';

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cobrar a ${nombre}`}
      size="lg"
      submitLabel={etiquetaBoton}
      submitDisabled={nadaQueCobrar}
      loading={guardando}
      onSubmit={cobrar}
    >
      <div className={styles.cuerpo}>
        <section aria-labelledby="cobro-cargos">
          <h3 id="cobro-cargos" className={styles.titulo}>Qué paga ahora</h3>
          {cobrables.length === 0 ? (
            <p className={styles.vacio}>Sin cargos pendientes. Puedes recargar saldo.</p>
          ) : (
            <ul className={styles.cargos}>
              {cobrables.map((cargo) => {
                const falta = faltaParaPagar(cargo.pendiente, disponible);
                return (
                  <li key={cargo.id}>
                    <label className={`${styles.cargo} ${marcados.has(cargo.id) ? styles.cargoMarcado : ''}`}>
                      <input type="checkbox" checked={marcados.has(cargo.id)} onChange={() => alternar(cargo.id)} />
                      <span className={styles.cargoTexto}>
                        <span className={styles.cargoConcepto}>{cargo.concepto}</span>
                        <span className={styles.cargoDetalle}>
                          {tipoCargoTexto(cargo.tipo)} · {formatFecha(cargo.fecha_hecho)}
                          {cargo.tipo === 'PAQUETE' && falta > 0 && ` · Faltan ${formatMoney(falta)} de saldo`}
                        </span>
                      </span>
                      <span className={styles.cargoMonto}>{formatMoney(cargo.pendiente)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.resumen} aria-label="Resumen del cobro">
          <div className={styles.linea}>
            <span>Total marcado</span>
            <strong>{formatMoney(plan.total)}</strong>
          </div>
          <div className={styles.linea}>
            <span>{ETIQUETA_DISPONIBLE} del cliente</span>
            <strong>{formatMoney(disponible)}</strong>
          </div>
          {disponible > 0 && marcados.size > 0 && (
            <label className={styles.casilla}>
              <input type="checkbox" checked={usarSaldo} onChange={(e) => setUsarSaldo(e.target.checked)} />
              <span>Usar saldo disponible</span>
            </label>
          )}
          {plan.usaSaldo > 0 && (
            <div className={styles.linea}>
              <span>Se descontarán del saldo del cliente</span>
              <strong>{formatMoney(plan.usaSaldo)}</strong>
            </div>
          )}
          <div className={`${styles.linea} ${styles.lineaFinal}`}>
            <span>El cliente paga ahora</span>
            <strong>{formatMoney(plan.nuevoPago)}</strong>
          </div>
        </section>

        <div className={styles.campos}>
          <FormField label="Recargar saldo (opcional)" htmlFor="cobro-recarga" hint="Queda como saldo disponible.">
            <input
              id="cobro-recarga"
              type="text"
              inputMode="decimal"
              value={recarga}
              onChange={(e) => { setRecarga(e.target.value); setError(''); }}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Local" labelId="cobro-local-label" required>
            <LocalSelect value={localId} onChange={setLocalId} id="cobro-local" />
          </FormField>
        </div>

        {plan.requiereMetodo && (
          <FormField label="Método de pago" labelId="cobro-metodo">
            <TipoPagoSelector value={tipoPago} onChange={setTipoPago} />
          </FormField>
        )}

        <FechaHechoField id="cobro-fecha" value={fecha} onChange={setFecha} label="Fecha del cobro" />

        <FormSubmitError message={error} />
      </div>
    </FormModal>
  );
}
