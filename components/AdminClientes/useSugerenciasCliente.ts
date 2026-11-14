'use client';

import { useEffect, useState } from 'react';
import { getSugerenciasCliente, type ClienteSugerido } from '@/lib/api/vinculo';
import type { ClienteSugerencia } from './ClienteSelect';

function pistaDe(s: ClienteSugerido): string | undefined {
  if (s.por_telefono && s.por_nombre) return 'mismo teléfono y nombre';
  if (s.por_telefono) return 'mismo teléfono';
  if (s.por_nombre) return 'mismo nombre';
  return undefined;
}

/** Clientes que podrian ser el dueño de una reserva sin cliente (por telefono o nombre). Es una pista: nunca vincula. */
export function useSugerenciasCliente(reservaId: number | null): ClienteSugerencia[] {
  const [sugeridos, setSugeridos] = useState<ClienteSugerido[]>([]);

  useEffect(() => {
    if (reservaId == null) return;
    const control = new AbortController();
    getSugerenciasCliente(reservaId, control.signal)
      .then((res) => setSugeridos(res.data ?? []))
      .catch(() => setSugeridos([]));
    return () => control.abort();
  }, [reservaId]);

  return sugeridos.map((s) => ({ cliente: s, pista: pistaDe(s) }));
}
