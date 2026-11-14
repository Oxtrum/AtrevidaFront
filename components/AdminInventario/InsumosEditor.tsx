'use client';

import { useEffect, useState } from 'react';
import { getInsumosServicio, guardarInsumosServicio } from '@/lib/api/inventario';
import { useInventarioItems } from '@/lib/hooks/useInventarioItems';
import { LineItemsEditor, newLine, parsePositive } from './LineItemsEditor';
import type { ItemLine } from './LineItemsEditor';

const ACTIVE_ITEMS = { activo: true } as const;

export interface InsumosEditorHandle {
  /** Devuelve un mensaje de error de validación, o null si está listo para guardar. */
  validate: () => string | null;
  save: (servicioId: number) => Promise<void>;
}

interface InsumosEditorProps {
  /** Servicio existente (carga sus insumos). null = servicio nuevo, sin insumos aún. */
  servicioId: number | null;
  onReady: (handle: InsumosEditorHandle) => void;
}

/**
 * Sección "Insumos por sesión" del modal de servicio. Expone validate/save al
 * padre vía `onReady` para guardarse junto con el servicio (PUT /servicios/:id/insumos).
 */
export function InsumosEditor({ servicioId, onReady }: InsumosEditorProps) {
  const { items } = useInventarioItems(ACTIVE_ITEMS);
  const [lines, setLines] = useState<ItemLine[]>([]);
  const [loadedFor, setLoadedFor] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (loadedFor === servicioId) return;
    setLoadedFor(servicioId); // eslint-disable-line react-hooks/set-state-in-effect
    if (servicioId === null) {
      setLines([]);
      return;
    }
    getInsumosServicio(servicioId)
      .then((insumos) =>
        setLines(insumos.map((i) => newLine({ item_id: String(i.item_id), cantidad: String(i.cantidad_por_sesion) }))),
      )
      .catch(() => setLines([]));
  }, [servicioId, loadedFor]);

  useEffect(() => {
    const filled = () => lines.filter((l) => l.item_id || l.cantidad);
    onReady({
      validate: () =>
        filled().some((l) => !l.item_id || !parsePositive(l.cantidad))
          ? 'Cada insumo necesita ítem y una cantidad por sesión mayor a 0'
          : null,
      save: (id) =>
        guardarInsumosServicio(
          id,
          filled().map((l) => ({ item_id: Number(l.item_id), cantidad_por_sesion: parsePositive(l.cantidad) })),
        ),
    });
  }, [lines, onReady]);

  return (
    <LineItemsEditor
      lines={lines}
      items={items}
      onChange={setLines}
      quantityLabel="Cantidad por sesión"
      addLabel="Agregar insumo"
    />
  );
}
