'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChoiceChips, FechaHechoField, FormField, FormGrid, FormModal, FormSubmitError, LocalSelect } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { crearCargo } from '@/lib/api/cuenta';
import { getInventarioItems } from '@/lib/api/inventario';
import { getCombosDB, getServiciosDB } from '@/lib/api/servicios';
import { useLocales } from '@/lib/hooks/useLocales';
import { conceptoInsumo, montoSugerido, parseCantidad } from '@/lib/utils/cargoForm';
import { parseMonto, TIPOS_CARGO } from '@/lib/utils/cuenta';
import type { TipoCargo } from '@/lib/utils/cuenta';
import { formatMoney } from '@/lib/utils/format';
import { idLocalInicial } from '@/lib/utils/localCaja';

interface CargoFormModalProps {
  isOpen: boolean;
  clienteId: number;
  onClose: () => void;
  onSaved: () => void;
}

/** Lo que se puede elegir del catálogo del local según el tipo de cargo. */
interface Opcion {
  value: string;
  nombre: string;
  precio: number | null;
  /** Texto de la lista: nombre con su precio o su stock. */
  etiqueta: string;
}

const ETIQUETA_ELEGIR: Record<Exclude<TipoCargo, 'OTRO'>, string> = {
  SERVICIO: 'Servicio',
  PAQUETE: 'Paquete',
  INSUMO: 'Insumo',
};

const precioDe = (v: unknown): number | null => {
  const n = Number(v);
  return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n;
};

const conPrecio = (nombre: string, precio: number | null) => (precio !== null ? `${nombre} — ${formatMoney(precio)}` : nombre);

/**
 * Registra lo que un cliente debe. Servicio, paquete e insumo se eligen del catálogo del local y proponen su precio;
 * un insumo además baja su stock. "Otro" es un cargo libre. Un monto 0 deja constancia de un consumo que no se cobra.
 */
export function CargoFormModal({ isOpen, clienteId, onClose, onSaved }: CargoFormModalProps) {
  const { locales } = useLocales();
  const [tipo, setTipo] = useState<TipoCargo>('SERVICIO');
  const [localId, setLocalId] = useState('');
  const [elegido, setElegido] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Catálogo leído y la consulta a la que corresponde: si no coincide con la actual, está cargando.
  const [leido, setLeido] = useState<{ clave: string; opciones: Opcion[] }>({ clave: '', opciones: [] });

  const local = locales.find((l) => String(l.id) === localId);
  const clave = `${tipo}|${localId}`;
  const necesitaCatalogo = tipo !== 'OTRO' && !!local;

  useEffect(() => {
    if (!isOpen) return;
    setTipo('SERVICIO');
    setElegido('');
    setCantidad('1');
    setConcepto('');
    setMonto('');
    setFecha('');
    setErrors({});
  }, [isOpen]);

  // Local inicial: el del usuario, el último de la caja o el único que existe.
  useEffect(() => {
    if (!isOpen || localId || locales.length === 0) return;
    setLocalId(idLocalInicial(locales));
  }, [isOpen, localId, locales]);

  useEffect(() => {
    if (!isOpen || tipo === 'OTRO' || !local) return;
    let cancelado = false;
    const leer = async (): Promise<Opcion[]> => {
      if (tipo === 'SERVICIO') {
        const res = await getServiciosDB({ local: local.nombre });
        return (res.data?.servicios ?? []).filter((s) => s.activo !== false).map((s) => {
          const precio = s.costo_variable === true ? null : precioDe(s.costo);
          return { value: String(s.id), nombre: s.nombre, precio, etiqueta: conPrecio(s.nombre, precio) };
        });
      }
      if (tipo === 'PAQUETE') {
        const res = await getCombosDB({ local: local.nombre }) as {
          data?: { combos?: { id: number; nombre: string; costo_total?: string; precio_paquete?: number }[] };
        };
        return (res.data?.combos ?? []).map((c) => {
          const precio = precioDe(c.precio_paquete ?? c.costo_total);
          return { value: String(c.id), nombre: c.nombre, precio, etiqueta: conPrecio(c.nombre, precio) };
        });
      }
      const items = await getInventarioItems({ local_id: local.id, activo: true, limit: 500 });
      return items.map((i) => ({
        value: String(i.id),
        nombre: i.nombre,
        precio: i.precio_venta ?? null,
        etiqueta: `${i.nombre} — stock ${i.stock_actual}`,
      }));
    };
    leer()
      .then((opciones) => { if (!cancelado) setLeido({ clave, opciones }); })
      .catch(() => { if (!cancelado) setLeido({ clave, opciones: [] }); });
    return () => { cancelado = true; };
  }, [isOpen, tipo, local, clave]);

  const opciones = useMemo(() => (leido.clave === clave ? leido.opciones : []), [leido, clave]);
  const cargando = necesitaCatalogo && leido.clave !== clave;
  const opcion = opciones.find((o) => o.value === elegido);

  const cambiarTipo = (nuevo: TipoCargo) => {
    setTipo(nuevo);
    setElegido('');
    setCantidad('1');
    setConcepto('');
    setMonto('');
    setErrors({});
  };

  const cambiarLocal = (id: string) => {
    setLocalId(id);
    setElegido('');
    setConcepto('');
    setMonto('');
  };

  /** Al elegir del catálogo se proponen concepto y monto; siguen siendo editables. */
  const elegir = (valor: string) => {
    setElegido(valor);
    setErrors({});
    const o = opciones.find((x) => x.value === valor);
    if (!o) return;
    const unidades = tipo === 'INSUMO' ? parseCantidad(cantidad) ?? 1 : 1;
    setConcepto(tipo === 'INSUMO' ? conceptoInsumo(o.nombre, unidades) : tipo === 'PAQUETE' ? `Paquete: ${o.nombre}` : o.nombre);
    setMonto(montoSugerido(o.precio, unidades));
  };

  const cambiarCantidad = (texto: string) => {
    setCantidad(texto);
    setErrors({});
    const unidades = parseCantidad(texto);
    if (opcion && unidades) {
      setConcepto(conceptoInsumo(opcion.nombre, unidades));
      setMonto(montoSugerido(opcion.precio, unidades));
    }
  };

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    const m = parseMonto(monto);
    const unidades = parseCantidad(cantidad);
    if (tipo !== 'OTRO' && !local) e.local = 'Elige el local';
    if (tipo !== 'OTRO' && local && !opcion) e.elegido = `Elige el ${ETIQUETA_ELEGIR[tipo].toLowerCase()}`;
    if (tipo === 'INSUMO' && !unidades) e.cantidad = 'Cantidad mayor a 0';
    if (!concepto.trim()) e.concepto = 'El concepto es obligatorio';
    if (m === null) e.monto = 'Monto inválido (0 si no se cobra)';
    setErrors(e);
    if (Object.keys(e).length || m === null) return;

    setSaving(true);
    try {
      await crearCargo(clienteId, {
        tipo,
        concepto: concepto.trim(),
        monto: m,
        fecha_hecho: fecha || undefined,
        local_id: tipo !== 'OTRO' ? local?.id : undefined,
        ...(tipo === 'INSUMO' && opcion && unidades ? { item_id: Number(opcion.value), cantidad: unidades } : {}),
      });
      toast.success('Cargo registrado');
      onSaved();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'No se pudo registrar el cargo' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Nuevo cargo" onSubmit={handleSubmit} loading={saving} submitLabel="Registrar cargo">
      <FormGrid>
        <FormField label="Tipo" labelId="cargo-tipo" required wide>
          <ChoiceChips options={TIPOS_CARGO} value={tipo} onChange={cambiarTipo} ariaLabel="Tipo de cargo" />
        </FormField>

        {tipo !== 'OTRO' && (
          <>
            <FormField label="Local" labelId="cargo-local" required error={errors.local} hint={tipo === 'INSUMO' ? 'De aquí baja el stock.' : undefined}>
              <LocalSelect value={localId} onChange={cambiarLocal} id="cargo-local" hasError={!!errors.local} />
            </FormField>
            <FormField label={ETIQUETA_ELEGIR[tipo]} labelId="cargo-elegido" required error={errors.elegido}>
              <CustomSelect
                value={elegido}
                onChange={elegir}
                options={opciones.map((o) => ({ value: o.value, label: o.etiqueta }))}
                placeholder={cargando ? 'Cargando…' : local ? `Elegir ${ETIQUETA_ELEGIR[tipo].toLowerCase()}` : 'Elige primero el local'}
                hasError={!!errors.elegido}
              />
            </FormField>
          </>
        )}

        {tipo === 'INSUMO' && (
          <FormField label="Cantidad" htmlFor="cargo-cantidad" required error={errors.cantidad}>
            <input id="cargo-cantidad" type="text" inputMode="decimal" value={cantidad} onChange={(e) => cambiarCantidad(e.target.value)} />
          </FormField>
        )}

        <FormField label="Monto" htmlFor="cargo-monto" required error={errors.monto} hint="0 = sin cobro.">
          <input id="cargo-monto" type="text" inputMode="decimal" value={monto} onChange={(e) => { setMonto(e.target.value); setErrors({}); }} placeholder="0.00" />
        </FormField>
        <FormField label="Concepto" htmlFor="cargo-concepto" required error={errors.concepto}>
          <input
            id="cargo-concepto"
            type="text"
            maxLength={300}
            value={concepto}
            onChange={(e) => { setConcepto(e.target.value); setErrors({}); }}
            placeholder="Ej. Limpieza facial"
            autoFocus={tipo === 'OTRO'}
          />
        </FormField>
        <FechaHechoField id="cargo-fecha" value={fecha} onChange={setFecha} />
      </FormGrid>
      <FormSubmitError message={errors.submit} />
    </FormModal>
  );
}
