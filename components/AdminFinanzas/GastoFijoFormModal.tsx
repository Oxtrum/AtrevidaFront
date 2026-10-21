'use client';

import { useEffect, useState } from 'react';
import { AlertBanner, FormField, FormGrid, FormModal, FormSubmitError, LocalSelect } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { guardarGastoFijo } from '@/lib/api/finanzas';
import { todayISO } from '@/lib/utils/format';
import { METODOS_PAGO } from '@/types/inventario';
import type { MetodoPago } from '@/types/inventario';
import { categoriaSirvePara, FRECUENCIAS, type CategoriaFinanciera, type FrecuenciaGasto, type GastoFijo } from '@/types/finanzas';

interface GastoFijoFormModalProps {
  isOpen: boolean;
  /** null = crear. */
  gasto: GastoFijo | null;
  /** Retomar un gasto desactivado: arranca activo, desde hoy y sin fecha de fin. */
  reactivar?: boolean;
  categorias: CategoriaFinanciera[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  nombre: string;
  categoria_id: string;
  monto: string;
  frecuencia: FrecuenciaGasto;
  local_id: string;
  metodo_pago: MetodoPago | '';
  proveedor: string;
  fecha_inicio: string;
  fecha_fin: string;
  notas: string;
  activo: boolean;
}

const EMPTY: FormState = {
  nombre: '', categoria_id: '', monto: '', frecuencia: 'MENSUAL', local_id: '', metodo_pago: '',
  proveedor: '', fecha_inicio: '', fecha_fin: '', notas: '', activo: true,
};

/** Primer pago al retomar un gasto: el próximo día de pago que tenía (hoy si cuenta por días), no el día de hoy. */
function fechaDeRetomo(gasto: GastoFijo): string {
  const hoy = todayISO();
  if (FRECUENCIAS.find((f) => f.value === gasto.frecuencia)?.porDias) return hoy;
  const [y, m] = hoy.split('-').map(Number);
  const en = (anio: number, mes: number) => {
    const ultimo = new Date(anio, mes, 0).getDate();
    const d = new Date(anio, mes - 1, Math.min(gasto.dia_cobro, ultimo));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const esteMes = en(y, m);
  return esteMes >= hoy ? esteMes : en(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1);
}

/** Plantilla de gasto recurrente (RN-30). Editarla afecta solo periodos futuros (RN-34). */
export function GastoFijoFormModal({ isOpen, gasto, reactivar = false, categorias, onClose, onSaved }: GastoFijoFormModalProps) {
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
            frecuencia: gasto.frecuencia ?? 'MENSUAL',
            local_id: gasto.local_id ? String(gasto.local_id) : '',
            metodo_pago: gasto.metodo_pago ?? '',
            proveedor: gasto.proveedor ?? '',
            fecha_inicio: gasto.fecha_inicio,
            fecha_fin: gasto.fecha_fin ?? '',
            notas: gasto.notas ?? '',
            activo: reactivar ? true : gasto.activo,
            ...(reactivar ? { fecha_inicio: fechaDeRetomo(gasto), fecha_fin: '' } : {}),
          }
        : { ...EMPTY, fecha_inicio: todayISO() },
    );
    setErrors({});
  }, [isOpen, gasto, reactivar]);

  const porDias = FRECUENCIAS.find((f) => f.value === form.frecuencia)?.porDias;

  const patch = (p: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors({});
  };

  const handleSubmit = async () => {
    const e: typeof errors = {};
    const monto = Number(form.monto.replace(',', '.'));
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!form.categoria_id) e.categoria_id = 'Selecciona una categoría';
    if (!(monto > 0)) e.monto = 'El monto debe ser mayor a 0';
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
          frecuencia: form.frecuencia,
          // El día sale de la fecha del primer pago; un gasto existente conserva el suyo si esa fecha no cambia.
          dia_cobro: gasto && form.fecha_inicio === gasto.fecha_inicio ? gasto.dia_cobro : Number(form.fecha_inicio.slice(8, 10)) || 1,
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
      {gasto && reactivar && (
        <div style={{ marginBottom: '1rem' }}>
          <AlertBanner tone="info" title="Retomar gasto fijo">Vuelve a generarse desde el primer pago indicado, que propone su próximo día de pago. Los meses que estuvo desactivado no se cobran ni quedan atrasados. Revisa el monto por si cambió.</AlertBanner>
        </div>
      )}
      {gasto && !reactivar && (
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
            options={categorias.filter((c) => categoriaSirvePara(c.naturaleza, 'EGRESO') && (c.activo || String(c.id) === form.categoria_id)).map((c) => ({ value: String(c.id), label: c.nombre }))}
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
        <FormField label="Se cobra" labelId="gf-frec-lbl" required hint="Cada cuánto hay que pagarlo. Los cobros se van generando solos.">
          <CustomSelect
            value={form.frecuencia}
            onChange={(v) => patch({ frecuencia: v as FrecuenciaGasto })}
            options={FRECUENCIAS.map((f) => ({ value: f.value, label: f.label }))}
            searchable={false}
            ariaLabelledBy="gf-frec-lbl"
          />
        </FormField>
        <FormField label="Primer pago" htmlFor="gf-ini" required error={errors.fecha_inicio} hint={porDias ? `Luego se cobra cada ${porDias === 1 ? 'día' : `${porDias} días`}.` : 'Los siguientes caen el mismo día de cada periodo; si el mes no tiene ese día, el último.'}>
          <input id="gf-ini" type="date" value={form.fecha_inicio} onChange={(e) => patch({ fecha_inicio: e.target.value })} />
        </FormField>
        <FormField label="Vigente hasta" htmlFor="gf-fin" error={errors.fecha_fin} hint="Opcional. Para un contrato de 3 meses, pon aquí su último día: no se generan más cobros.">
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
            <input type="checkbox" checked={form.activo} onChange={(e) => patch(e.target.checked && !gasto.activo ? { activo: true, fecha_inicio: fechaDeRetomo(gasto), fecha_fin: '' } : { activo: e.target.checked })} style={{ accentColor: 'var(--admin-accent-primary)' }} />
            Activo (se genera cada mes){!gasto.activo && form.activo ? ' — retoma desde el primer pago indicado' : ''}
          </label>
        )}
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
