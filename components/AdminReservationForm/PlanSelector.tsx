'use client';

import { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getPlanesDB, type PlanItem } from '@/lib/api/planes';

interface PlanSelectorProps {
  clienteNombre: string;
  planId: number | null;
  onChange: (planId: number | null) => void;
}

export default function PlanSelector({ clienteNombre, planId, onChange }: PlanSelectorProps) {
  const [planes, setPlanes] = useState<PlanItem[]>([]);

  useEffect(() => {
    if (!clienteNombre.trim()) return;

    let cancelled = false;
    getPlanesDB({ cliente: clienteNombre, estado: 'ACTIVO' })
      .then((res) => {
        if (cancelled) return;
        const data = res as { data?: { planes?: PlanItem[] } };
        setPlanes((data?.data?.planes ?? []).filter((p) => p.sesiones_totales - p.sesiones_usadas > 0));
      })
      .catch(() => {
        if (!cancelled) setPlanes([]);
      });
    return () => { cancelled = true; };
  }, [clienteNombre]);

  if (planes.length === 0) return null;

  const options = [
    { value: '', label: 'No usar paquete' },
    ...planes.map((p) => ({
      value: String(p.id),
      label: `${p.combo_nombre_snapshot ?? 'Paquete'} — ${p.sesiones_totales - p.sesiones_usadas}/${p.sesiones_totales} sesiones`,
    })),
  ];

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <label id="lbl-plan" htmlFor="plan-select">Usar paquete</label>
      <CustomSelect
        id="plan-select"
        ariaLabelledBy="lbl-plan"
        value={planId != null ? String(planId) : ''}
        onChange={(v) => onChange(v ? Number(v) : null)}
        options={options}
      />
    </div>
  );
}
