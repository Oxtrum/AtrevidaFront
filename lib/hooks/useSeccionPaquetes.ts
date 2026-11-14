'use client';

import { useEffect, useState } from 'react';
import { getConfiguracionPublica } from '@/lib/api/configuracion';
import { mostrarSeccionPaquetes } from '@/lib/utils/visibilidadPublica';

let cache: boolean | null = null;
let inflight: Promise<boolean> | null = null;

function cargar(): Promise<boolean> {
  if (cache !== null) return Promise.resolve(cache);
  inflight ??= getConfiguracionPublica()
    .then((cfg) => mostrarSeccionPaquetes(cfg))
    // Si la consulta falla no se oculta el catálogo por error.
    .catch(() => true)
    .then((visible) => {
      cache = visible;
      return visible;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * ¿Se muestra la sección de paquetes en la página principal? `null` mientras se
 * consulta: la página y el menú la tratan como visible hasta saber lo contrario.
 */
export function useSeccionPaquetes(): boolean | null {
  const [visible, setVisible] = useState<boolean | null>(cache);

  useEffect(() => {
    let activo = true;
    cargar().then((v) => {
      if (activo) setVisible(v);
    });
    return () => {
      activo = false;
    };
  }, []);

  return visible;
}
