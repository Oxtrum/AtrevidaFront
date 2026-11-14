'use client';

import { useEffect, useState } from 'react';
import { FormField, FormModal, FormSubmitError, LocalSelect, TipoPagoSelector } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { cobrarCliente } from '@/lib/api/cuenta';
import { useLocales } from '@/lib/hooks/useLocales';
import { ETIQUETA_DISPONIBLE, parseMonto } from '@/lib/utils/cuenta';
import { formatMoney } from '@/lib/utils/format';
import { idLocalInicial } from '@/lib/utils/localCaja';
import type { TipoPago } from '@/lib/utils/tipoPago';

interface RecargaModalProps {
  isOpen: boolean;
  clienteId: number;
  nombre: string;
  /** Saldo disponible actual, si se conoce. */
  disponible?: number;
  onClose: () => void;
  onRecargado: () => void;
}

/**
 * Recarga de saldo desde la ficha: dinero que el cliente deja para después (cuotas de un paquete, adelantos). Entra hoy
 * como un pago a cuenta y queda como saldo disponible; no cubre ningún cargo hasta que se cobre. En caja se recarga
 * desde la pestaña Cuenta, como una línea más del ticket.
 */
export function RecargaModal({ isOpen, clienteId, nombre, disponible, onClose, onRecargado }: RecargaModalProps) {
  const { locales } = useLocales();
  const [monto, setMonto] = useState('');
  const [tipoPago, setTipoPago] = useState<TipoPago>('efectivo');
  const [localId, setLocalId] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMonto('');
    setTipoPago('efectivo');
    setError('');
  }, [isOpen]);

  // El local es el de la caja (o el del usuario); solo se pregunta si no hay manera de saberlo.
  const localConocido = locales.length > 0 && idLocalInicial(locales) !== '';
  useEffect(() => {
    if (!isOpen || locales.length === 0) return;
    setLocalId(idLocalInicial(locales));
  }, [isOpen, locales]);

  const local = locales.find((l) => String(l.id) === localId);

  const recargar = async () => {
    const importe = parseMonto(monto);
    if (importe === null || importe <= 0) {
      setError('Ingresa un monto mayor a 0');
      return;
    }
    if (!local) {
      setError('Elige el local donde se recibe el dinero');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await cobrarCliente(clienteId, {
        local_id: local.id,
        local_nombre: local.nombre,
        cargo_ids: [],
        usar_saldo: false,
        recarga: importe,
        tipo_pago: tipoPago,
      });
      toast.success(`Saldo recargado: ${formatMoney(importe)}`);
      onRecargado();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo recargar el saldo');
    } finally {
      setGuardando(false);
    }
  };

  const importe = parseMonto(monto);

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Recargar saldo a ${nombre}`}
      submitLabel={importe && importe > 0 ? `Recargar ${formatMoney(importe)}` : 'Recargar'}
      loading={guardando}
      onSubmit={recargar}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {disponible !== undefined && (
          <p style={{ margin: 0, color: 'var(--admin-text-muted)', fontSize: 'var(--admin-fs-sm)' }}>
            {ETIQUETA_DISPONIBLE} actual: {formatMoney(disponible)}
          </p>
        )}
        <FormField label="Monto" htmlFor="recarga-monto" required>
          <input
            id="recarga-monto"
            type="text"
            inputMode="decimal"
            value={monto}
            onChange={(e) => { setMonto(e.target.value); setError(''); }}
            placeholder="0.00"
            autoFocus
          />
        </FormField>
        <FormField label="Método de pago" labelId="recarga-metodo">
          <TipoPagoSelector value={tipoPago} onChange={setTipoPago} variant="fila" />
        </FormField>
        {!localConocido && (
          <FormField label="Local" labelId="recarga-local" required>
            <LocalSelect value={localId} onChange={setLocalId} id="recarga-local" />
          </FormField>
        )}
        <FormSubmitError message={error} />
      </div>
    </FormModal>
  );
}
