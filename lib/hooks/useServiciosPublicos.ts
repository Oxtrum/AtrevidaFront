'use client';

import { useState, useEffect, useCallback } from 'react';
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
    costo: precio > 0 ? `${precio} Bs` : 'Gratis',
    precio,
    sesiones: row.sesiones ?? 1,
    sucursal: row.local,
    requiere_evaluacion: row.requiere_evaluacion ?? false,
    tipoEspacio,
  };
}

export function useServiciosPublicos(sucursal: string) {
  const [servicios, setServicios] = useState<ServicioPublico[]>(() => staticFallback(sucursal));
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (local: string) => {
    if (!local) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ local });
      const res = await fetch(`/api/bd/servicios?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data?: { servicios?: ServicioDBRow[] } };
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
    } catch {
      setServicios(staticFallback(local));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(sucursal);
  }, [sucursal, load]);

  return { servicios, loading };
}

// Re-export for convenience
export { SERVICIOS_DISPONIBLES };
