'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCostoServicio } from '@/lib/utils/serviceCost';
import {
  SERVICIOS_DISPONIBLES,
  SERVICIO_TRATAMIENTO_ESPECIALIZADO,
  getServiciosPorSucursal,
} from '@/types/reserva';

export interface ServicioPublico {
  value: string;
  label: string;
  categoria: string;
  duracion: string;
  costo: string;
  precio: number;
  costo_variable?: boolean;
  sesiones: number;
  sucursal: string;
  requiere_evaluacion: boolean;
  tipoEspacio: string;
  nota?: string;
}

interface ServicioDBRow {
  id: number;
  nombre: string;
  categoria: string;
  local: string;
  tiempo: string;
  costo: number | string;
  costo_variable?: boolean;
  sesiones: number;
  tipo_espacio_requerido?: string;
  tipoEspacio?: string;
  activo?: boolean;
  requiere_evaluacion?: boolean;
}

const TRATAMIENTO: ServicioPublico = {
  value: SERVICIO_TRATAMIENTO_ESPECIALIZADO.value,
  label: SERVICIO_TRATAMIENTO_ESPECIALIZADO.label,
  categoria: SERVICIO_TRATAMIENTO_ESPECIALIZADO.categoria,
  duracion: SERVICIO_TRATAMIENTO_ESPECIALIZADO.duracion,
  costo: SERVICIO_TRATAMIENTO_ESPECIALIZADO.costo,
  precio: SERVICIO_TRATAMIENTO_ESPECIALIZADO.precio,
  sesiones: 1,
  sucursal: SERVICIO_TRATAMIENTO_ESPECIALIZADO.sucursal,
  requiere_evaluacion: SERVICIO_TRATAMIENTO_ESPECIALIZADO.requiere_evaluacion,
  tipoEspacio: 'mesa',
  nota: SERVICIO_TRATAMIENTO_ESPECIALIZADO.nota,
};

function staticFallback(sucursal: string): ServicioPublico[] {
  const filtered = getServiciosPorSucursal(sucursal);
  return (filtered as unknown as Array<{
    value: string; label: string; categoria: string; duracion: string;
    costo: string; precio: number; sucursal: string; requiere_evaluacion: boolean; nota?: string;
  }>).map(s => ({
    ...s,
    sesiones: 1,
    tipoEspacio: s.categoria === 'Bicicleta' ? 'bicicleta' : 'mesa',
  }));
}

function mapRow(row: ServicioDBRow): ServicioPublico {
  const tipoEspacio = (row.tipo_espacio_requerido ?? row.tipoEspacio ?? 'mesa').toLowerCase();
  const precio = typeof row.costo === 'number' ? row.costo : (Number(row.costo) || 0);
  return {
    value: row.nombre,
    label: row.nombre,
    categoria: row.categoria,
    duracion: row.tiempo,
    costo: formatCostoServicio(row),
    costo_variable: row.costo_variable === true,
    precio,
    sesiones: row.sesiones ?? 1,
    sucursal: row.local,
    requiere_evaluacion: row.requiere_evaluacion ?? false,
    tipoEspacio,
  };
}

export function useServiciosPublicos(sucursal: string, pacienteNuevo?: boolean, enabled = true) {
  const [servicios, setServicios] = useState<ServicioPublico[]>(() => staticFallback(sucursal));
  const [loading, setLoading] = useState(false);
  const [loadedLocal, setLoadedLocal] = useState(sucursal);

  const load = useCallback(async (local: string, signal: AbortSignal) => {
    if (!local) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ local });
      if (pacienteNuevo) qs.set('paciente_nuevo', 'true');
      const res = await fetch(`/api/bd/servicios?${qs.toString()}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data?: { servicios?: ServicioDBRow[] } };
      if (signal.aborted) return;
      const rawRows = (json.data?.servicios ?? []).filter(r => r.activo !== false);
      // Deduplicate by nombre — backend may return same service for multiple locals
      const seen = new Set<string>();
      const rows = rawRows.filter(r => {
        if (seen.has(r.nombre)) return false;
        seen.add(r.nombre);
        return true;
      });
      if (rows.length > 0) {
        setServicios([...rows.map(mapRow), TRATAMIENTO]);
      } else {
        setServicios(staticFallback(local));
      }
      setLoadedLocal(local);
    } catch {
      if (!signal.aborted) {
        setServicios(staticFallback(local));
        setLoadedLocal(local);
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [pacienteNuevo]);

  useEffect(() => {
    const controller = new AbortController();
    if (enabled) void load(sucursal, controller.signal);
    return () => controller.abort();
  }, [sucursal, load, enabled]);

  return { servicios: loadedLocal === sucursal ? servicios : staticFallback(sucursal), loading };
}

// Re-export for convenience
export { SERVICIOS_DISPONIBLES };
