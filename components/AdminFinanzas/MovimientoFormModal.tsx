'use client';

import { useEffect, useState } from 'react';
import { AlertBanner, FormField, FormGrid, FormModal, FormSubmitError, LocalSelect } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { actualizarMovimientoFinanciero, crearMovimientoFinanciero } from '@/lib/api/finanzas';
import { todayISO } from '@/lib/utils/format';
import { METODOS_PAGO } from '@/types/inventario';
import type { MetodoPago } from '@/types/inventario';
import { categoriaSirvePara, type CategoriaFinanciera, type MovimientoFinanciero, type NaturalezaFinanciera } from '@/types/finanzas';

interface MovimientoFormModalProps {
  isOpen: boolean;
  /** Qué se registra al crear. Al editar se toma del movimiento. */
  naturaleza: NaturalezaFinanciera;
  /** null = crear. */
  movimiento: MovimientoFinanciero | null;
  categorias: CategoriaFinanciera[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  categoria_id: string;
  local_id: string;
  fecha: string;
  monto: string;
  descripcion: string;
  proveedor: string;
  metodo_pago: MetodoPago | '';
  estado: 'PAGADO' | 'PENDIENTE';
}

const EMPTY: FormState = {
  categoria_id: '',
  local_id: '',
  fecha: '',
  monto: '',
  descripcion: '',
  proveedor: '',
  metodo_pago: '',
  estado: 'PAGADO',
};

/** Crear/editar un egreso variable, un otro ingreso, o ajustar un egreso fijo ya generado (solo ese mes). */
export function MovimientoFormModal({ isOpen, naturaleza, movimiento, categorias, onClose, onSaved }: MovimientoFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'submit', string>>>({});
  const [saving, setSaving] = useState(false);

  const nat = movimiento?.naturaleza ?? naturaleza;
  const esFijoGenerado = movimiento?.clase === 'FIJO';
  const deCompra = Boolean(movimiento?.compra_id);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      movimiento
        ? {
            categoria_id: String(movimiento.categoria_id),
            local_id: movimiento.local_id ? String(movimiento.local_id) : '',
            fecha: movimiento.fecha,
            monto: String(movimiento.monto),
            descripcion: movimiento.descripcion ?? '',
            proveedor: movimiento.proveedor ?? '',
            metodo_pago: movimiento.metodo_pago ?? '',
            estado: movimiento.estado === 'PENDIENTE' ? 'PENDIENTE' : 'PAGADO',
          }
        : { ...EMPTY, fecha: todayISO() },
    );
    setErrors({});
  }, [isOpen, movimiento]);

  const patch = (p: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors({});
  };

  const handleSubmit = async () => {
    const e: typeof errors = {};
    const monto = Number(form.monto.replace(',', '.'));
    if (!form.categoria_id) e.categoria_id = 'Selecciona una categoría';
    if (!form.fecha) e.fecha = 'La fecha es obligatoria';
    if (!(monto > 0)) e.monto = 'El monto debe ser mayor a 0';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    const payload = {
      naturaleza: nat,
      ...(nat === 'EGRESO' && { clase: movimiento?.clase ?? ('VARIABLE' as const) }),
      categoria_id: Number(form.categoria_id),
      local_id: form.local_id ? Number(form.local_id) : null,
      fecha: form.fecha,
      monto,
      descripcion: form.descripcion.trim() || undefined,
      proveedor: form.proveedor.trim() || undefined,
      metodo_pago: form.metodo_pago || undefined,
      estado: form.estado,
    };
    try {
      if (movimiento) await actualizarMovimientoFinanciero(movimiento.id, payload);
      else await crearMovimientoFinanciero(payload);
      toast.success(movimiento ? 'Movimiento actualizado' : nat === 'EGRESO' ? 'Egreso registrado' : 'Ingreso registrado');
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo guardar' });
    } finally {
      setSaving(false);
    }
  };

  const title = movimiento ? `Editar ${movimiento.codigo}` : nat === 'EGRESO' ? 'Registrar egreso' : 'Registrar otro ingreso';

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={title} onSubmit={handleSubmit} loading={saving} submitLabel={movimiento ? 'Guardar' : 'Registrar'} size="lg">
      {esFijoGenerado && (
        <div style={{ marginBottom: '1rem' }}>
          <AlertBanner tone="info">
            Este egreso viene de un gasto fijo. Los cambios aplican <strong>solo a este mes</strong>; para cambiar los meses siguientes edita la plantilla en Configuración › Gastos fijos.
          </AlertBanner>
        </div>
      )}
      {deCompra && (
        <div style={{ marginBottom: '1rem' }}>
          <AlertBanner tone="info">Este egreso pertenece a una compra de inventario. Para corregirla, anula la compra desde Inventario.</AlertBanner>
        </div>
      )}
      <FormGrid>
        <FormField label="Categoría" labelId="mov-cat-lbl" required error={errors.categoria_id}>
          <CustomSelect
            value={form.categoria_id}
            onChange={(v) => patch({ categoria_id: v })}
            options={categorias.filter((c) => categoriaSirvePara(c.naturaleza, nat) && (c.activo || String(c.id) === form.categoria_id)).map((c) => ({ value: String(c.id), label: c.nombre }))}
            placeholder="Seleccionar categoría…"
            hasError={!!errors.categoria_id}
            ariaLabelledBy="mov-cat-lbl"
          />
        </FormField>
        <FormField label="Local" hint="Sin local = gasto general de la empresa.">
          <LocalSelect value={form.local_id} onChange={(v) => patch({ local_id: v })} emptyLabel="General (sin local)" />
        </FormField>
        <FormField label="Fecha" htmlFor="mov-fecha" required error={errors.fecha}>
          <input id="mov-fecha" type="date" value={form.fecha} onChange={(e) => patch({ fecha: e.target.value })} />
        </FormField>
        <FormField label="Monto" htmlFor="mov-monto" required error={errors.monto}>
          <input id="mov-monto" type="text" inputMode="decimal" value={form.monto} onChange={(e) => patch({ monto: e.target.value })} placeholder="0.00" />
        </FormField>
        {nat === 'EGRESO' && (
          <FormField label="Proveedor / beneficiario" htmlFor="mov-prov">
            <input id="mov-prov" type="text" value={form.proveedor} onChange={(e) => patch({ proveedor: e.target.value })} />
          </FormField>
        )}
        <FormField label="Método de pago" labelId="mov-met-lbl">
          <CustomSelect
            value={form.metodo_pago}
            onChange={(v) => patch({ metodo_pago: v as MetodoPago | '' })}
            options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))}
            placeholder="Sin especificar"
            allowClear
            searchable={false}
            ariaLabelledBy="mov-met-lbl"
          />
        </FormField>
        <FormField label="Estado" labelId="mov-est-lbl">
          <CustomSelect
            value={form.estado}
            onChange={(v) => patch({ estado: v as FormState['estado'] })}
            options={[
              { value: 'PAGADO', label: nat === 'EGRESO' ? 'Pagado' : 'Cobrado' },
              { value: 'PENDIENTE', label: 'Pendiente' },
            ]}
            searchable={false}
            ariaLabelledBy="mov-est-lbl"
          />
        </FormField>
        <FormField label="Descripción" htmlFor="mov-desc" wide>
          <textarea id="mov-desc" value={form.descripcion} onChange={(e) => patch({ descripcion: e.target.value })} />
        </FormField>
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
