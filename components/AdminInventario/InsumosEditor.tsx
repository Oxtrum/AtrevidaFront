'use client';

import { useEffect, useState } from 'react';
import { getInsumosServicio, guardarInsumosServicio } from '@/lib/api/inventario';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useInventarioItems } from '@/lib/hooks/useInventarioItems';
import { LineItemsEditor, newLine, parsePositive } from './LineItemsEditor';
import type { ItemLine } from './LineItemsEditor';

const ACTIVE_ITEMS = { activo: true, por_local: true } as const;

export interface InsumosEditorHandle {
  /** Devuelve un mensaje de error de validación, o null si está listo para guardar. */
  validate: () => string | null;
  save: (servicioId: number) => Promise<void>;
}

interface InsumosEditorProps {
  /** Servicio existente (carga sus insumos). null = servicio nuevo, sin insumos aún. */
  servicioId: number | null;
  /** El catálogo debe limitarse al local donde se ofrece el servicio. */
  localId?: number;
  localName?: string;
  onReady: (handle: InsumosEditorHandle) => void;
}

/**
 * Sección "Insumos por sesión" del modal de servicio. Expone validate/save al
 * padre vía `onReady` para guardarse junto con el servicio (PUT /servicios/:id/insumos).
 */
export function InsumosEditor({ servicioId, localId, localName, onReady }: InsumosEditorProps) {
  const [busquedaItem, setBusquedaItem] = useState('');
  const busquedaAplicada = useDebouncedValue(busquedaItem.trim());
  const puedeBuscar = localId !== undefined && busquedaAplicada.length >= 2;
  const { items } = useInventarioItems(
    { ...ACTIVE_ITEMS, local_id: localId, q: puedeBuscar ? busquedaAplicada : undefined },
    puedeBuscar,
  );
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
        setLines(insumos.map((i) => newLine({
          item_id: String(i.item_id),
          item_label: i.item_nombre,
          item_subtitle: i.unidad_medida ? `${localName || 'Local del servicio'} · ${i.unidad_medida}` : localName,
          item_unidad: i.unidad_medida,
          cantidad: i.cantidad_por_sesion == null ? '' : String(i.cantidad_por_sesion),
        }))),
      )
      .catch(() => setLines([]));
  }, [servicioId, loadedFor, localName]);

  useEffect(() => {
    const filled = () => lines.filter((l) => l.item_id || l.cantidad.trim());
    // Cantidad vacía = uso variable (se escribe en cada atención); si se escribe, debe ser mayor a 0.
    const cantidadOpcional = (v: string) => (v.trim() ? parsePositive(v) : null);
    onReady({
      validate: () => {
        if (filled().some((l) => !l.item_id)) return 'Elige el ítem de cada insumo o quita la línea vacía';
        if (filled().some((l) => l.cantidad.trim() && !parsePositive(l.cantidad))) {
          return 'La cantidad por sesión debe ser mayor a 0, o déjala vacía si el uso varía';
        }
        return null;
      },
      save: (id) =>
        guardarInsumosServicio(
          id,
          filled().map((l) => ({ item_id: Number(l.item_id), cantidad_por_sesion: cantidadOpcional(l.cantidad) })),
        ),
    });
  }, [lines, onReady]);

  return (
    <LineItemsEditor
      lines={lines}
      items={items}
      onChange={setLines}
      quantityLabel="Cantidad por sesión"
      quantityPlaceholder="Variable"
      addLabel="Agregar insumo"
      emptyHint="Este servicio todavía no tiene insumos. Agrega los que usa en cada sesión y se cargarán solos al registrar la atención."
      footerHint="Deja la cantidad vacía si el uso varía: el insumo aparecerá en la atención para que escribas cuánto se usó, y no se reservará stock de antemano."
      onItemSearchChange={setBusquedaItem}
      itemSearchMinChars={2}
      itemLocalName={localName}
    />
  );
}
