'use client';

import { useCallback, useEffect, useState } from 'react';
import { actualizarConfiguracion, getConfiguracion } from '@/lib/api/configuracion';
import type { ConfiguracionSistema } from '@/types/finanzas';

export const CONFIG_DEFAULTS: ConfiguracionSistema = {
  'inventario.politica_sin_stock': 'ADVERTIR',
  'inventario.descontar_en_estado': 'COMPLETADO',
  'inventario.permitir_stock_negativo': true,
  'inventario.considerar_comprometido': true,
  'finanzas.estado_gasto_fijo_generado': 'PENDIENTE',
  'finanzas.dias_aviso_gasto_fijo': 3,
  'finanzas.zona_horaria': 'America/La_Paz',
  'finanzas.moneda': 'Bs',
  'rrhh.dia_pago_defecto': 1,
  'rrhh.aporte_laboral_pct': 12.71,
  'rrhh.aporte_patronal_pct': 16.71,
  'rrhh.dias_mes_faltas': 30,
};

// Caché a nivel de módulo: moneda y política se leen en muchas pantallas.
let cache: ConfiguracionSistema | null = null;
let inflight: Promise<ConfiguracionSistema> | null = null;
const listeners = new Set<(c: ConfiguracionSistema) => void>();

function load(force = false): Promise<ConfiguracionSistema> {
  if (cache && !force) return Promise.resolve(cache);
  if (!inflight) {
    inflight = getConfiguracion()
      .then((c) => {
        cache = { ...CONFIG_DEFAULTS, ...c };
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Parámetros del sistema con defaults mientras carga o si el backend aún no responde. */
export function useConfiguracion() {
  const [config, setConfig] = useState<ConfiguracionSistema>(cache ?? CONFIG_DEFAULTS);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    listeners.add(setConfig);
    if (!window.localStorage.getItem('adminToken')) {
      return () => {
        listeners.delete(setConfig);
      };
    }
    load()
      .then(setConfig)
      .catch(() => undefined) // defaults: el módulo sigue usable sin configuración
      .finally(() => setLoading(false));
    return () => {
      listeners.delete(setConfig);
    };
  }, []);

  const update = useCallback(async (patch: Partial<ConfiguracionSistema>) => {
    const next = { ...CONFIG_DEFAULTS, ...(await actualizarConfiguracion(patch)) };
    cache = next;
    listeners.forEach((fn) => fn(next));
  }, []);

  return { config, loading, update, moneda: config['finanzas.moneda'] };
}
