'use client';

import { useEffect, useState } from 'react';
import { AlertBanner, FormField, FormGrid, FormModal, FormSubmitError, formatMes } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { generarPlanilla } from '@/lib/api/rrhh';
import type { Empleado } from '@/types/rrhh';
import { EmpleadoSelect } from './EmpleadoSelect';

interface GenerarPlanillaModalProps {
  isOpen: boolean;
  empleados: Empleado[];
  /** Mes YYYY-MM de la planilla a generar. */
  periodo: string;
  onClose: () => void;
  onGenerated: () => void;
}

/** Adelanta la planilla de un empleado (p. ej. para cargar bonos o faltas) o regenera una anulada. */
export function GenerarPlanillaModal({ isOpen, empleados, periodo, onClose, onGenerated }: GenerarPlanillaModalProps) {
  const [empleado, setEmpleado] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmpleado('');
    setError('');
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!empleado) {
      setError('Selecciona un empleado');
      return;
    }
    setSaving(true);
    try {
      await generarPlanilla(Number(empleado), periodo);
      toast.success('Planilla generada');
      onGenerated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Generar planilla · ${formatMes(periodo)}`} onSubmit={handleSubmit} loading={saving} submitLabel="Generar">
      <div style={{ marginBottom: '1rem' }}>
        <AlertBanner tone="info">
          Las planillas se generan solas el día de pago de cada empleado. Usa esto para cargarla antes (bonos, faltas) o para regenerar una anulada.
        </AlertBanner>
      </div>
      <FormGrid>
        <FormField label="Empleado" labelId="gp-emp-lbl" required wide>
          <EmpleadoSelect empleados={empleados} value={empleado} onChange={(v) => { setEmpleado(v); setError(''); }} hasError={!!error} ariaLabelledBy="gp-emp-lbl" />
        </FormField>
      </FormGrid>
      <FormSubmitError message={error} />
    </FormModal>
  );
}
