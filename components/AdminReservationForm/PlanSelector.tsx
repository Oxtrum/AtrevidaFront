'use client';

import { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getPlanByID, getPlanesDB, type PlanItem } from '@/lib/api/planes';
import { PAGE_LIMIT } from '@/lib/api/pagination';

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

const normalize = (value: string | undefined) => (value ?? '').trim().toLocaleUpperCase('es-BO');

const isAvailableFor = (plan: PlanItem, client: string, local: string) => (
  plan.estado === 'ACTIVO'
  && plan.activo !== false
  && plan.sesiones_usadas < plan.sesiones_totales
  && normalize(plan.cliente_nombre_texto || plan.cliente) === normalize(client)
  && normalize(plan.local_nombre_texto) === normalize(local)
);

export default function PlanSelector({ clienteNombre, planId, localNombre, onChange }: PlanSelectorProps) {
  const [planes, setPlanes] = useState<PlanItem[]>([]);
  const [loadedKey, setLoadedKey] = useState('');
  const nombre = clienteNombre.trim();
  const local = localNombre.trim();
  const queryKey = `${nombre}|${local}`;
  const loading = nombre.length >= 2 && !!local && loadedKey !== queryKey;

  useEffect(() => {
    if (nombre.length < 2 || !local) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    getPlanesDB({ cliente: nombre, estado: 'ACTIVO', local, limit: PAGE_LIMIT }, controller.signal)
      .then((res) => {
        if (!cancelled) setPlanes(res?.data?.planes ?? []);
      })
      .catch(() => {
        if (!cancelled) setPlanes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(queryKey);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nombre, local, queryKey]);

  // El listado es sólo para sugerencias. La selección se consulta directamente
  // para que un plan posterior al resultado 50 no se descarte por accidente.
  useEffect(() => {
    if (planId == null || nombre.length < 2 || !local) return;

    let cancelled = false;
    const controller = new AbortController();
    getPlanByID(planId, controller.signal)
      .then((res) => {
        if (cancelled) return;
        const plan = res?.data?.plan;
        if (!plan || !isAvailableFor(plan, nombre, local)) {
          onChange(null);
          return;
        }
        setPlanes((current) => current.some((item) => item.id === plan.id) ? current : [plan, ...current]);
      })
      .catch(() => {
        if (!cancelled) onChange(null);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nombre, local, planId, onChange]);

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
    ...planes.map((plan) => ({
      value: String(plan.id),
      label: `${plan.combo_nombre_texto ?? 'Paquete'} — ${plan.sesiones_totales - plan.sesiones_usadas} sesiones disponibles`,
    })),
  ];

  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <label id="lbl-plan" htmlFor="plan-select">Usar paquete</label>
      {loading ? (
        <p style={noteStyle}>Cargando paquetes...</p>
      ) : planes.length > 0 ? (
        <CustomSelect
          id="plan-select"
          ariaLabelledBy="lbl-plan"
          value={planId != null ? String(planId) : ''}
          onChange={(value) => onChange(value ? Number(value) : null)}
          options={options}
        />
      ) : (
        <p style={noteStyle}>Este cliente no tiene paquetes activos en esta sucursal.</p>
      )}
    </div>
  );
}
