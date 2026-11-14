'use client';

import { useEffect, useState } from 'react';
import { AlertBanner, FormField, FormGrid, FormModal, FormSubmitError, SectionLabel, formatMes } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { editarPlanilla, getTiposBono } from '@/lib/api/rrhh';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { formatMoney } from '@/lib/utils/format';
import type { Planilla, PlanillaBono, TipoBono } from '@/types/rrhh';
import { BonosEditor, montoLinea } from './BonosEditor';
import type { BonoLineaForm } from './BonosEditor';
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
  const [tipos, setTipos] = useState<TipoBono[]>([]);
  const [bonos, setBonos] = useState<BonoLineaForm[]>([]);
  const [faltas, setFaltas] = useState('');
  const [otros, setOtros] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !planilla) return;
    setBonos(planilla.bonos_detalle.map((b) => ({ tipo: String(b.tipo_bono_id), monto: String(b.monto), nota: b.nota ?? '' })));
    setFaltas(String(planilla.dias_falta));
    setOtros(String(planilla.otros_descuentos));
    setNotas(planilla.notas ?? '');
    setError('');
  }, [isOpen, planilla]);

  // El catálogo se vuelve a pedir al abrir: pudo cambiar en la pestaña Bonos.
  useEffect(() => {
    if (!isOpen) return;
    getTiposBono().then(setTipos).catch(() => setTipos([]));
  }, [isOpen]);

  if (!planilla) return null;

  const valorDia = planilla.sueldo_base / config['rrhh.dias_mes_faltas'];

  // Misma fórmula que calcularSueldo del backend, para ver el resultado antes de guardar.
  const redondear = (v: number) => Math.round(v * 100) / 100;
  const num = (s: string) => {
    const n = Number(s.replace(',', '.') || 0);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  };
  const lineasValidas = bonos.filter((l) => l.tipo && montoLinea(l) > 0);
  const bonosNum = redondear(lineasValidas.reduce((acc, l) => acc + redondear(montoLinea(l)), 0));
  const faltasNum = num(faltas);
  const otrosNum = num(otros);
  const aplicaAportes = planilla.aporte_laboral > 0 || planilla.aporte_patronal > 0;
  const descuentoFaltas = redondear(valorDia * faltasNum);
  const totalGanado = redondear(planilla.sueldo_base + bonosNum - descuentoFaltas);
  const aporteLaboral = aplicaAportes ? redondear((totalGanado * config['rrhh.aporte_laboral_pct']) / 100) : 0;
  const aportePatronal = aplicaAportes ? redondear((totalGanado * config['rrhh.aporte_patronal_pct']) / 100) : 0;
  const netoPagar = redondear(totalGanado - aporteLaboral - planilla.adelantos - otrosNum);
  const detallePreview: PlanillaBono[] = lineasValidas.map((l, i) => ({
    id: i,
    tipo_bono_id: Number(l.tipo),
    tipo_nombre: tipos.find((t) => String(t.id) === l.tipo)?.nombre ?? 'Bono',
    monto: redondear(montoLinea(l)),
    nota: l.nota.trim() || null,
  }));
  const preview: Planilla = {
    ...planilla,
    bonos: bonosNum,
    bonos_detalle: detallePreview,
    dias_falta: faltasNum,
    otros_descuentos: otrosNum,
    descuento_faltas: descuentoFaltas,
    total_ganado: totalGanado,
    aporte_laboral: aporteLaboral,
    aporte_patronal: aportePatronal,
    neto_pagar: netoPagar,
    costo_empresa: redondear(totalGanado + aportePatronal),
  };

  const handleSubmit = async () => {
    const f = Number(faltas.replace(',', '.') || 0);
    const o = Number(otros.replace(',', '.') || 0);
    if ([f, o].some((n) => Number.isNaN(n) || n < 0)) {
      setError('Faltas y descuentos deben ser números positivos');
      return;
    }
    if (bonos.some((l) => !l.tipo || !(montoLinea(l) > 0))) {
      setError('Cada bono necesita un tipo y un monto mayor a 0. Quita las líneas que no uses.');
      return;
    }
    setSaving(true);
    try {
      await editarPlanilla(planilla.id, {
        bonos_detalle: bonos.map((l) => ({ tipo_bono_id: Number(l.tipo), monto: montoLinea(l), nota: l.nota.trim() || null })),
        dias_falta: f,
        otros_descuentos: o,
        notas: notas.trim() || null,
      });
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
          Cada día de falta descuenta {formatMoney(valorDia, moneda)} ({formatMoney(planilla.sueldo_base, moneda)} ÷ {config['rrhh.dias_mes_faltas']}). El resumen se recalcula al escribir; el egreso en Finanzas se actualiza al guardar.
        </AlertBanner>
      </div>
      <SectionLabel>Bonos</SectionLabel>
      <div style={{ margin: '0.5rem 0 1.25rem' }}>
        <BonosEditor tipos={tipos} lineas={bonos} moneda={moneda} onChange={(l) => { setBonos(l); setError(''); }} />
      </div>
      <FormGrid>
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
        <PlanillaDesglose planilla={preview} moneda={moneda} />
      </div>
      {(totalGanado <= 0 || netoPagar < 0) && (
        <div style={{ marginTop: '1rem' }}>
          <AlertBanner tone="warning">
            {totalGanado <= 0 ? 'Las faltas superan lo ganado: no se podrá guardar.' : 'El neto queda negativo: los descuentos superan lo ganado.'}
          </AlertBanner>
        </div>
      )}
      <FormSubmitError message={error} />
    </FormModal>
  );
}
