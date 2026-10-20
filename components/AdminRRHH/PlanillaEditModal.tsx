'use client';

import { useEffect, useState } from 'react';
import { AlertBanner, FormField, FormGrid, FormModal, FormSubmitError, formatMes } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { editarPlanilla } from '@/lib/api/rrhh';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatMoney } from '@/lib/utils/format';
import type { Planilla } from '@/types/rrhh';
import { PlanillaDesglose } from './PlanillaDesglose';

interface PlanillaEditModalProps {
  isOpen: boolean;
  planilla: Planilla | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Bonos, faltas y otros descuentos de una planilla pendiente. El servidor recalcula aportes, neto y egreso. */
export function PlanillaEditModal({ isOpen, planilla, onClose, onSaved }: PlanillaEditModalProps) {
  const { config, moneda } = useConfiguracion();
  const [bonos, setBonos] = useState('');
  const [faltas, setFaltas] = useState('');
  const [otros, setOtros] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !planilla) return;
    setBonos(String(planilla.bonos));
    setFaltas(String(planilla.dias_falta));
    setOtros(String(planilla.otros_descuentos));
    setNotas(planilla.notas ?? '');
    setError('');
  }, [isOpen, planilla]);

  if (!planilla) return null;

  const valorDia = planilla.sueldo_base / config['rrhh.dias_mes_faltas'];

  const handleSubmit = async () => {
    const b = Number(bonos.replace(',', '.') || 0);
    const f = Number(faltas.replace(',', '.') || 0);
    const o = Number(otros.replace(',', '.') || 0);
    if ([b, f, o].some((n) => Number.isNaN(n) || n < 0)) {
      setError('Bonos, faltas y descuentos deben ser números positivos');
      return;
    }
    setSaving(true);
    try {
      await editarPlanilla(planilla.id, { bonos: b, dias_falta: f, otros_descuentos: o, notas: notas.trim() || null });
      toast.success('Planilla actualizada');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`${planilla.empleado_nombre} · ${formatMes(planilla.periodo.slice(0, 7))}`} onSubmit={handleSubmit} loading={saving} submitLabel="Guardar y recalcular" size="lg">
      <div style={{ marginBottom: '1rem' }}>
        <AlertBanner tone="info">
          Cada día de falta descuenta {formatMoney(valorDia, moneda)} ({formatMoney(planilla.sueldo_base, moneda)} ÷ {config['rrhh.dias_mes_faltas']}). El egreso en Finanzas se actualiza solo.
        </AlertBanner>
      </div>
      <FormGrid>
        <FormField label="Bonos" htmlFor="pl-bonos">
          <input id="pl-bonos" type="text" inputMode="decimal" value={bonos} onChange={(e) => { setBonos(e.target.value); setError(''); }} />
        </FormField>
        <FormField label="Días de falta" htmlFor="pl-faltas" hint="Admite medios días (0.5).">
          <input id="pl-faltas" type="text" inputMode="decimal" value={faltas} onChange={(e) => { setFaltas(e.target.value); setError(''); }} />
        </FormField>
        <FormField label="Otros descuentos" htmlFor="pl-otros" hint="Multas, préstamos, etc. Los adelantos se descuentan solos.">
          <input id="pl-otros" type="text" inputMode="decimal" value={otros} onChange={(e) => { setOtros(e.target.value); setError(''); }} />
        </FormField>
        <FormField label="Notas" htmlFor="pl-notas" wide>
          <textarea id="pl-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </FormField>
      </FormGrid>
      <div style={{ marginTop: '1rem' }}>
        <PlanillaDesglose planilla={planilla} moneda={moneda} />
      </div>
      <FormSubmitError message={error} />
    </FormModal>
  );
}
