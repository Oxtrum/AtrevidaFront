'use client';

import { useEffect, useState } from 'react';
import { AlertBanner, FormField, FormGrid, FormModal, FormSubmitError } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { registrarAdelanto } from '@/lib/api/rrhh';
import { todayISO } from '@/lib/utils/format';
import type { Empleado } from '@/types/rrhh';
import { EmpleadoSelect } from './EmpleadoSelect';

interface AdelantoFormModalProps {
  isOpen: boolean;
  empleados: Empleado[];
  /** Empleado preseleccionado (acción desde su fila). */
  empleadoId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Anticipo de sueldo: se descuenta solo en la siguiente planilla del empleado. */
export function AdelantoFormModal({ isOpen, empleados, empleadoId, onClose, onSaved }: AdelantoFormModalProps) {
  const [empleado, setEmpleado] = useState('');
  const [fecha, setFecha] = useState('');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmpleado(empleadoId ? String(empleadoId) : '');
    setFecha(todayISO());
    setMonto('');
    setMotivo('');
    setErrors({});
  }, [isOpen, empleadoId]);

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    const m = Number(monto.replace(',', '.'));
    if (!empleado) e.empleado = 'Selecciona un empleado';
    if (!(m > 0)) e.monto = 'El monto debe ser mayor a 0';
    if (!fecha) e.fecha = 'La fecha es obligatoria';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await registrarAdelanto({ empleado_id: Number(empleado), fecha, monto: m, motivo: motivo.trim() || null });
      toast.success('Adelanto registrado');
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo registrar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Registrar adelanto" onSubmit={handleSubmit} loading={saving} submitLabel="Registrar">
      <div style={{ marginBottom: '1rem' }}>
        <AlertBanner tone="info">El adelanto se descuenta automáticamente en la siguiente planilla del empleado.</AlertBanner>
      </div>
      <FormGrid>
        <FormField label="Empleado" labelId="adl-emp-lbl" required error={errors.empleado} wide>
          <EmpleadoSelect empleados={empleados} value={empleado} onChange={(v) => { setEmpleado(v); setErrors({}); }} hasError={!!errors.empleado} ariaLabelledBy="adl-emp-lbl" />
        </FormField>
        <FormField label="Monto" htmlFor="adl-monto" required error={errors.monto}>
          <input id="adl-monto" type="text" inputMode="decimal" value={monto} onChange={(e) => { setMonto(e.target.value); setErrors({}); }} placeholder="0.00" autoFocus />
        </FormField>
        <FormField label="Fecha" htmlFor="adl-fecha" required error={errors.fecha}>
          <input id="adl-fecha" type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setErrors({}); }} />
        </FormField>
        <FormField label="Motivo" htmlFor="adl-motivo" wide>
          <input id="adl-motivo" type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Opcional" />
        </FormField>
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
