'use client';

import { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getPlanesDB, type PlanItem } from '@/lib/api/planes';

interface PlanSelectorProps {
  clienteNombre: string;
  planId: number | null;
  localNombre: string;
  onChange: (planId: number | null) => void;
}

const noteStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--admin-text-dim)',
  margin: '0.35rem 0 0',
};

export default function PlanSelector({ clienteNombre, planId, localNombre, onChange }: PlanSelectorProps) {
  const [planes, setPlanes] = useState<PlanItem[]>([]);
  const nombre = clienteNombre.trim();
  const local = localNombre.trim();

  useEffect(() => {
    if (nombre.length < 2 || !local) return;
    let cancelled = false;
    getPlanesDB({ cliente: nombre, estado: 'ACTIVO', local })
      .then((res) => {
        if (cancelled) return;
        const data = res as { data?: { planes?: PlanItem[] } };
        setPlanes(data?.data?.planes ?? []);
      })
      .catch(() => {
        if (!cancelled) setPlanes([]);
      });
    return () => { cancelled = true; };
  }, [nombre, local]);

  // Limpia selección si el plan ya no está en la lista (cambio de sucursal, agotado, etc.)
  useEffect(() => {
    if (planId == null) return;
    const stillAvailable = planes.some((p) => p.id === planId);
    if (!stillAvailable) onChange(null);
  }, [planes, planId, onChange]);

  if (!local) {
    return (
      <div style={{ gridColumn: '1 / -1' }}>
        <label id="lbl-plan" htmlFor="plan-select">Usar paquete</label>
        <p style={noteStyle}>Seleccione una sucursal primero.</p>
      </div>
    );
  }

  if (nombre.length < 2) return null;

  const options = [
    { value: '', label: 'No usar paquete' },
    ...planes.map((p) => ({
      value: String(p.id),
      label: `${p.combo_nombre_snapshot ?? 'Paquete'} — ${p.sesiones_totales} sesiones`,
    })),
  ];

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <label id="lbl-plan" htmlFor="plan-select">Usar paquete</label>
      {planes.length > 0 ? (
        <CustomSelect
          id="plan-select"
          ariaLabelledBy="lbl-plan"
          value={planId != null ? String(planId) : ''}
          onChange={(v) => onChange(v ? Number(v) : null)}
          options={options}
        />
      ) : (
        <p style={noteStyle}>Este cliente no tiene paquetes activos en esta sucursal.</p>
      )}
    </div>
  );
}
