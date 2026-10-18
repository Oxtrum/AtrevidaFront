'use client';

import { useEffect, useState } from 'react';
import { AlertBanner, FormField, FormGrid, FormModal, FormSubmitError, LocalSelect } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { guardarGastoFijo } from '@/lib/api/finanzas';
import { todayISO } from '@/lib/utils/format';
import { METODOS_PAGO } from '@/types/inventario';
import type { MetodoPago } from '@/types/inventario';
import type { CategoriaFinanciera, GastoFijo } from '@/types/finanzas';

interface GastoFijoFormModalProps {
  isOpen: boolean;
  /** null = crear. */
  gasto: GastoFijo | null;
  categorias: CategoriaFinanciera[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  nombre: string;
  categoria_id: string;
  monto: string;
  dia_cobro: string;
  local_id: string;
  metodo_pago: MetodoPago | '';
  proveedor: string;
  fecha_inicio: string;
  fecha_fin: string;
  notas: string;
  activo: boolean;
}

const EMPTY: FormState = {
  nombre: '', categoria_id: '', monto: '', dia_cobro: '1', local_id: '', metodo_pago: '',
  proveedor: '', fecha_inicio: '', fecha_fin: '', notas: '', activo: true,
};

/** Plantilla de gasto recurrente (RN-30). Editarla afecta solo periodos futuros (RN-34). */
export function GastoFijoFormModal({ isOpen, gasto, categorias, onClose, onSaved }: GastoFijoFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'submit', string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      gasto
        ? {
            nombre: gasto.nombre,
            categoria_id: String(gasto.categoria_id),
            monto: String(gasto.monto),
            dia_cobro: String(gasto.dia_cobro),
            local_id: gasto.local_id ? String(gasto.local_id) : '',
            metodo_pago: gasto.metodo_pago ?? '',
            proveedor: gasto.proveedor ?? '',
            fecha_inicio: gasto.fecha_inicio,
            fecha_fin: gasto.fecha_fin ?? '',
            notas: gasto.notas ?? '',
            activo: gasto.activo,
          }
        : { ...EMPTY, fecha_inicio: todayISO().slice(0, 8) + '01' },
    );
    setErrors({});
  }, [isOpen, gasto]);

  const patch = (p: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors({});
  };

  const handleSubmit = async () => {
    const e: typeof errors = {};
    const monto = Number(form.monto.replace(',', '.'));
    const dia = Number(form.dia_cobro);
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!form.categoria_id) e.categoria_id = 'Selecciona una categoría';
    if (!(monto > 0)) e.monto = 'El monto debe ser mayor a 0';
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) e.dia_cobro = 'Día entre 1 y 31';
    if (!form.fecha_inicio) e.fecha_inicio = 'La fecha de inicio es obligatoria';
    if (form.fecha_fin && form.fecha_fin < form.fecha_inicio) e.fecha_fin = 'No puede ser anterior al inicio';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await guardarGastoFijo(
        {
          nombre: form.nombre.trim(),
          categoria_id: Number(form.categoria_id),
          monto,
          dia_cobro: dia,
          local_id: form.local_id ? Number(form.local_id) : null,
          metodo_pago: form.metodo_pago || null,
          proveedor: form.proveedor.trim() || null,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin || null,
          activo: form.activo,
          notas: form.notas.trim() || null,
        },
        gasto?.id,
      );
      toast.success(gasto ? 'Gasto fijo actualizado' : 'Gasto fijo creado');
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo guardar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={gasto ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} onSubmit={handleSubmit} loading={saving} submitLabel={gasto ? 'Guardar' : 'Crear'} size="lg">
      {gasto && (
        <div style={{ marginBottom: '1rem' }}>
          <AlertBanner tone="info">Los cambios solo afectan los meses que aún no se han generado. Los egresos ya generados no se modifican.</AlertBanner>
        </div>
      )}
      <FormGrid>
        <FormField label="Nombre" htmlFor="gf-nombre" required error={errors.nombre} wide>
          <input id="gf-nombre" type="text" value={form.nombre} onChange={(e) => patch({ nombre: e.target.value })} placeholder="Ej: Alquiler Paseo Aranjuez" autoFocus />
        </FormField>
        <FormField label="Categoría" labelId="gf-cat-lbl" required error={errors.categoria_id}>
          <CustomSelect
            value={form.categoria_id}
            onChange={(v) => patch({ categoria_id: v })}
            options={categorias.filter((c) => c.naturaleza === 'EGRESO' && (c.activo || String(c.id) === form.categoria_id)).map((c) => ({ value: String(c.id), label: c.nombre }))}
            placeholder="Seleccionar categoría…"
            hasError={!!errors.categoria_id}
            ariaLabelledBy="gf-cat-lbl"
          />
        </FormField>
        <FormField label="Local" hint="Sin local = gasto general de la empresa.">
          <LocalSelect value={form.local_id} onChange={(v) => patch({ local_id: v })} emptyLabel="General (sin local)" />
        </FormField>
        <FormField label="Monto mensual" htmlFor="gf-monto" required error={errors.monto}>
          <input id="gf-monto" type="text" inputMode="decimal" value={form.monto} onChange={(e) => patch({ monto: e.target.value })} placeholder="0.00" />
        </FormField>
        <FormField label="Día de cobro" htmlFor="gf-dia" required error={errors.dia_cobro} hint="Si el mes no tiene ese día (ej. 31 en febrero) se usa el último día.">
          <input id="gf-dia" type="number" min={1} max={31} value={form.dia_cobro} onChange={(e) => patch({ dia_cobro: e.target.value })} />
        </FormField>
        <FormField label="Vigente desde" htmlFor="gf-ini" required error={errors.fecha_inicio}>
          <input id="gf-ini" type="date" value={form.fecha_inicio} onChange={(e) => patch({ fecha_inicio: e.target.value })} />
        </FormField>
        <FormField label="Vigente hasta" htmlFor="gf-fin" error={errors.fecha_fin} hint="Opcional. Para dar de baja sin perder el historial.">
          <input id="gf-fin" type="date" value={form.fecha_fin} min={form.fecha_inicio || undefined} onChange={(e) => patch({ fecha_fin: e.target.value })} />
        </FormField>
        <FormField label="Método de pago" labelId="gf-met-lbl">
          <CustomSelect
            value={form.metodo_pago}
            onChange={(v) => patch({ metodo_pago: v as MetodoPago | '' })}
            options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))}
            placeholder="Sin especificar"
            allowClear
            searchable={false}
            ariaLabelledBy="gf-met-lbl"
          />
        </FormField>
        <FormField label="Proveedor / beneficiario" htmlFor="gf-prov">
          <input id="gf-prov" type="text" value={form.proveedor} onChange={(e) => patch({ proveedor: e.target.value })} />
        </FormField>
        <FormField label="Notas" htmlFor="gf-notas" wide>
          <textarea id="gf-notas" value={form.notas} onChange={(e) => patch({ notas: e.target.value })} />
        </FormField>
        {gasto && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.activo} onChange={(e) => patch({ activo: e.target.checked })} style={{ accentColor: 'var(--admin-accent-primary)' }} />
            Activo (se genera cada mes)
          </label>
        )}
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
