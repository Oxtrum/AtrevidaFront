'use client';

import { useEffect, useState } from 'react';
import { AlertBanner, FormField, FormGrid, FormModal, FormSubmitError, LocalSelect } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { guardarEmpleado } from '@/lib/api/rrhh';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { todayISO } from '@/lib/utils/format';
import { METODOS_PAGO } from '@/types/inventario';
import type { MetodoPago } from '@/types/inventario';
import type { Empleado } from '@/types/rrhh';

interface EmpleadoFormModalProps {
  isOpen: boolean;
  /** null = crear. */
  empleado: Empleado | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  nombre: string;
  apellido: string;
  ci: string;
  cargo: string;
  telefono: string;
  local_id: string;
  sueldo_base: string;
  /** '' = usa el día por defecto de Parámetros. */
  dia_pago: string;
  aplica_aportes: boolean;
  metodo_pago: MetodoPago | '';
  fecha_ingreso: string;
  fecha_baja: string;
  notas: string;
  activo: boolean;
}

const EMPTY: FormState = {
  nombre: '', apellido: '', ci: '', cargo: '', telefono: '', local_id: '', sueldo_base: '', dia_pago: '',
  aplica_aportes: true, metodo_pago: '', fecha_ingreso: '', fecha_baja: '', notas: '', activo: true,
};

/** Ficha de empleado. Editarla afecta solo planillas futuras aún no generadas. */
export function EmpleadoFormModal({ isOpen, empleado, onClose, onSaved }: EmpleadoFormModalProps) {
  const { config } = useConfiguracion();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | 'submit', string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      empleado
        ? {
            nombre: empleado.nombre,
            apellido: empleado.apellido,
            ci: empleado.ci ?? '',
            cargo: empleado.cargo ?? '',
            telefono: empleado.telefono ?? '',
            local_id: empleado.local_id ? String(empleado.local_id) : '',
            sueldo_base: String(empleado.sueldo_base),
            dia_pago: empleado.dia_pago ? String(empleado.dia_pago) : '',
            aplica_aportes: empleado.aplica_aportes,
            metodo_pago: empleado.metodo_pago ?? '',
            fecha_ingreso: empleado.fecha_ingreso,
            fecha_baja: empleado.fecha_baja ?? '',
            notas: empleado.notas ?? '',
            activo: empleado.activo,
          }
        : { ...EMPTY, fecha_ingreso: todayISO() },
    );
    setErrors({});
  }, [isOpen, empleado]);

  const patch = (p: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors({});
  };

  const handleSubmit = async () => {
    const e: typeof errors = {};
    const sueldo = Number(form.sueldo_base.replace(',', '.'));
    const dia = form.dia_pago === '' ? null : Number(form.dia_pago);
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!form.apellido.trim()) e.apellido = 'El apellido es obligatorio';
    if (!(sueldo > 0)) e.sueldo_base = 'El sueldo debe ser mayor a 0';
    if (dia !== null && (!Number.isInteger(dia) || dia < 1 || dia > 31)) e.dia_pago = 'Día entre 1 y 31';
    if (!form.fecha_ingreso) e.fecha_ingreso = 'La fecha de ingreso es obligatoria';
    if (form.fecha_baja && form.fecha_baja < form.fecha_ingreso) e.fecha_baja = 'No puede ser anterior al ingreso';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await guardarEmpleado(
        {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          ci: form.ci.trim() || null,
          cargo: form.cargo.trim() || null,
          telefono: form.telefono.trim() || null,
          local_id: form.local_id ? Number(form.local_id) : null,
          sueldo_base: sueldo,
          dia_pago: dia,
          aplica_aportes: form.aplica_aportes,
          metodo_pago: form.metodo_pago || null,
          fecha_ingreso: form.fecha_ingreso,
          fecha_baja: form.fecha_baja || null,
          activo: form.activo,
          notas: form.notas.trim() || null,
        },
        empleado?.id,
      );
      toast.success(empleado ? 'Empleado actualizado' : 'Empleado creado');
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo guardar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={empleado ? 'Editar empleado' : 'Nuevo empleado'} onSubmit={handleSubmit} loading={saving} submitLabel={empleado ? 'Guardar' : 'Crear'} size="lg">
      {empleado && (
        <div style={{ marginBottom: '1rem' }}>
          <AlertBanner tone="info">Los cambios solo afectan las planillas que aún no se han generado. Las ya generadas se corrigen desde la pestaña Planillas.</AlertBanner>
        </div>
      )}
      <FormGrid>
        <FormField label="Nombre" htmlFor="emp-nombre" required error={errors.nombre}>
          <input id="emp-nombre" type="text" value={form.nombre} onChange={(e) => patch({ nombre: e.target.value })} autoFocus />
        </FormField>
        <FormField label="Apellido" htmlFor="emp-apellido" required error={errors.apellido}>
          <input id="emp-apellido" type="text" value={form.apellido} onChange={(e) => patch({ apellido: e.target.value })} />
        </FormField>
        <FormField label="Cargo" htmlFor="emp-cargo">
          <input id="emp-cargo" type="text" value={form.cargo} onChange={(e) => patch({ cargo: e.target.value })} placeholder="Ej: Masajista" />
        </FormField>
        <FormField label="Local" hint="Sin local = personal general de la empresa.">
          <LocalSelect value={form.local_id} onChange={(v) => patch({ local_id: v })} emptyLabel="General (sin local)" />
        </FormField>
        <FormField label="CI" htmlFor="emp-ci">
          <input id="emp-ci" type="text" value={form.ci} onChange={(e) => patch({ ci: e.target.value })} />
        </FormField>
        <FormField label="Teléfono" htmlFor="emp-tel">
          <input id="emp-tel" type="text" inputMode="tel" value={form.telefono} onChange={(e) => patch({ telefono: e.target.value })} />
        </FormField>
        <FormField label="Sueldo base mensual" htmlFor="emp-sueldo" required error={errors.sueldo_base}>
          <input id="emp-sueldo" type="text" inputMode="decimal" value={form.sueldo_base} onChange={(e) => patch({ sueldo_base: e.target.value })} placeholder="0.00" />
        </FormField>
        <FormField
          label="Día de pago"
          htmlFor="emp-dia"
          error={errors.dia_pago}
          hint={`Vacío = día ${config['rrhh.dia_pago_defecto']} (por defecto). Si el mes no tiene ese día se usa el último.`}
        >
          <input id="emp-dia" type="number" min={1} max={31} value={form.dia_pago} onChange={(e) => patch({ dia_pago: e.target.value })} placeholder={`Por defecto: ${config['rrhh.dia_pago_defecto']}`} />
        </FormField>
        <FormField label="Fecha de ingreso" htmlFor="emp-ingreso" required error={errors.fecha_ingreso}>
          <input id="emp-ingreso" type="date" value={form.fecha_ingreso} onChange={(e) => patch({ fecha_ingreso: e.target.value })} />
        </FormField>
        <FormField label="Fecha de baja" htmlFor="emp-baja" error={errors.fecha_baja} hint="Opcional. Deja de generarse su planilla después de esta fecha.">
          <input id="emp-baja" type="date" value={form.fecha_baja} min={form.fecha_ingreso || undefined} onChange={(e) => patch({ fecha_baja: e.target.value })} />
        </FormField>
        <FormField label="Método de pago habitual" labelId="emp-met-lbl">
          <CustomSelect
            value={form.metodo_pago}
            onChange={(v) => patch({ metodo_pago: v as MetodoPago | '' })}
            options={METODOS_PAGO.map((m) => ({ value: m.value, label: m.label }))}
            placeholder="Sin especificar"
            allowClear
            searchable={false}
            ariaLabelledBy="emp-met-lbl"
          />
        </FormField>
        <FormField label="Aportes de ley" labelId="emp-apo-lbl" hint={`Se retiene ${config['rrhh.aporte_laboral_pct']}% al empleado y la empresa aporta ${config['rrhh.aporte_patronal_pct']}%.`}>
          <CustomSelect
            value={String(form.aplica_aportes)}
            onChange={(v) => patch({ aplica_aportes: v === 'true' })}
            options={[{ value: 'true', label: 'Aplican aportes' }, { value: 'false', label: 'Sin aportes' }]}
            searchable={false}
            ariaLabelledBy="emp-apo-lbl"
          />
        </FormField>
        <FormField label="Notas" htmlFor="emp-notas" wide>
          <textarea id="emp-notas" value={form.notas} onChange={(e) => patch({ notas: e.target.value })} />
        </FormField>
        {empleado && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.activo} onChange={(e) => patch({ activo: e.target.checked })} style={{ accentColor: 'var(--admin-accent-primary)' }} />
            Activo (se le genera planilla cada mes)
          </label>
        )}
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
