'use client';

import { useState } from 'react';
import { FormModal } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { crearPagoDB } from '@/lib/api/pagos';
import { cobrarPlan, type PlanItem } from '@/lib/api/planes';
import styles from './page.module.css';

interface LocalOpt { id: number; nombre: string; }

interface Props {
  plan: PlanItem;
  locales: LocalOpt[];
  onClose: () => void;
  onCobrado: () => void;
}

/**
 * PlanItem no trae un local_id numérico (solo local_nombre_texto), pero
 * crearPagoDB lo exige. Lo resolvemos matcheando el nombre contra el listado
 * completo de locales que ya carga la página (independiente del filtro activo).
 */
export default function CobrarPlanModal({ plan, locales, onClose, onCobrado }: Props) {
  const [tipoPago, setTipoPago] = useState<'efectivo' | 'qr'>('efectivo');
  const [saving, setSaving] = useState(false);

  const local = locales.find((l) => l.nombre === plan.local_nombre_texto);

  const handleSubmit = async () => {
    if (!local) {
      toast.error('No se pudo determinar el local de este paquete.');
      return;
    }
    setSaving(true);
    try {
      const pagoRes = await crearPagoDB({
        local_id: local.id,
        local_nombre: local.nombre,
        cliente_id: plan.cliente_id ?? null,
        cliente_nit: '',
        cliente_nombre: plan.cliente,
        descuento: 0,
        estado: 'PAGADO',
        tipo_pago: tipoPago,
        activo: true,
        detalle: [{
          servicio_id: null,
          servicio: plan.combo_nombre_texto ?? 'Paquete',
          precio_unitario: plan.precio_total,
          cantidad: 1,
          subtotal: plan.precio_total,
        }],
      });
      const codigo = pagoRes?.data?.codigo_pago;
      if (!codigo) throw new Error('sin codigo de pago');
      await cobrarPlan(plan.id, codigo);
      toast.success('Paquete cobrado y activado');
      onCobrado();
      onClose();
    } catch {
      toast.error('No se pudo cobrar el paquete.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      isOpen
      onClose={onClose}
      title="Cobrar paquete"
      onSubmit={handleSubmit}
      loading={saving}
      submitLabel="Cobrar"
    >
      <div className={styles.formStack}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryRow}>
            <span>Cliente</span>
            <strong>{plan.cliente}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Paquete</span>
            <strong>{plan.combo_nombre_texto ?? '—'}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Local</span>
            <strong>{plan.local_nombre_texto ?? '—'}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Total</span>
            <strong>{plan.precio_total} Bs</strong>
          </div>
        </div>

        <div className={styles.field}>
          <label id="lbl-tipo-pago" htmlFor="cobrar-tipo-pago">Tipo de pago</label>
          <CustomSelect
            id="cobrar-tipo-pago"
            ariaLabelledBy="lbl-tipo-pago"
            value={tipoPago}
            onChange={(v) => setTipoPago(v === 'qr' ? 'qr' : 'efectivo')}
            options={[
              { value: 'efectivo', label: 'Efectivo' },
              { value: 'qr', label: 'QR' },
            ]}
          />
        </div>

        {!local && (
          <span className={styles.fieldError}>
            No se encontró el local &quot;{plan.local_nombre_texto ?? '—'}&quot; en el listado de locales.
          </span>
        )}
      </div>
    </FormModal>
  );
}
