'use client';

import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/AdminConfig/ConfirmDialog';
import { FormField, FormGrid, FormModal } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { getInventarioItems } from '@/lib/api/inventario';
import {
  getInsumosSugeridos,
  getPersonalSugerido,
  actualizarAtencion,
  registrarAtencion,
  type Atencion,
  type InsumoSugerido,
  type PersonalSugerido,
} from '@/lib/api/atenciones';
import { getLocalesDB } from '@/lib/api/servicios';
import { getStoredAdminWorkplace } from '@/lib/auth/adminSession';
import type { InventarioItem } from '@/types/inventario';
import type { ReservaBD } from '@/types/reserva';
import styles from './AtencionFormModal.module.css';

type EstadoCatalogo = 'idle' | 'loading' | 'ready';
interface InsumoDraft { item: InventarioItem | InsumoSugerido; cantidad: string }

const horaCorta = (valor?: string) => {
  if (!valor) return '';
  const [hora, minuto] = valor.split(':');
  return `${hora.padStart(2, '0')}:${minuto ?? '00'}`;
};
const cantidadLabel = (valor: number) => new Intl.NumberFormat('es-BO', { maximumFractionDigits: 3 }).format(valor);
const idInsumo = (item: InventarioItem | InsumoSugerido) => 'id' in item ? item.id : item.item_id;
const nombreInsumo = (item: InventarioItem | InsumoSugerido) => 'nombre' in item ? item.nombre : item.item_nombre;
const stockInsumo = (item: InventarioItem | InsumoSugerido) => 'stock_actual' in item ? item.stock_actual : item.disponible;

interface AtencionFormModalProps {
  reserva: ReservaBD | null;
  atencion?: Atencion | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AtencionFormModal({ reserva, atencion, onClose, onSaved }: AtencionFormModalProps) {
  const reservaId = reserva?.id;
  const [nombre, setNombre] = useState('');
  const [empleadoId, setEmpleadoId] = useState<number>();
  const [sugerencias, setSugerencias] = useState<PersonalSugerido[]>([]);
  const [fecha, setFecha] = useState('');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [lugar, setLugar] = useState('');
  const [lugarBloqueado, setLugarBloqueado] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [catalogo, setCatalogo] = useState<InventarioItem[]>([]);
  const [insumos, setInsumos] = useState<InsumoDraft[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [estadoCatalogo, setEstadoCatalogo] = useState<EstadoCatalogo>('idle');
  const [error, setError] = useState('');
  const [confirmacionStock, setConfirmacionStock] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reserva) return;
    const workplace = getStoredAdminWorkplace();
    setNombre(atencion?.empleado_nombre ?? '');
    setEmpleadoId(atencion?.empleado_id);
    setSugerencias([]);
    setFecha(atencion?.fecha_atencion.slice(0, 10) ?? reserva.fecha.slice(0, 10));
    setInicio(horaCorta(atencion?.hora_inicio ?? reserva.hora_desde));
    setFin(horaCorta(atencion?.hora_fin ?? reserva.hora_hasta));
    setLugar(workplace?.nombre_local ?? atencion?.lugar ?? reserva.local);
    setLugarBloqueado(!!workplace);
    setObservaciones(atencion?.observaciones ?? '');
    setError('');
    setCatalogo([]);
    setInsumos([]);
    setBusqueda('');
    setEstadoCatalogo('loading');
    setConfirmacionStock(false);
  }, [reserva, atencion]);

  useEffect(() => {
    if (!reservaId || !reserva) return;
    const controller = new AbortController();
    const cargar = async () => {
      try {
        const workplace = getStoredAdminWorkplace();
        let localId = workplace?.local_id;
        if (!localId) {
          const locales = await getLocalesDB();
          localId = locales.data?.locales.find((local) => local.nombre === reserva.local)?.id;
        }

        const [items, sugeridos] = await Promise.all([
          getInventarioItems({ ...(localId ? { local_id: localId } : {}), activo: true, limit: 500 }),
          atencion ? Promise.resolve([]) : getInsumosSugeridos(reservaId, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setCatalogo(items);

        const catalogoPorId = new Map(items.map((item) => [item.id, item]));
        const iniciales = atencion
          ? atencion.insumos.flatMap((linea) => {
            if (!linea.item_id) return [];
            const item = catalogoPorId.get(linea.item_id);
            const insumo: InventarioItem | InsumoSugerido = item
              ? { ...item, stock_actual: item.stock_actual + linea.cantidad_descontada }
              : { item_id: linea.item_id, item_nombre: linea.item_nombre, unidad_medida: linea.unidad_medida, cantidad_por_sesion: linea.cantidad_usada, disponible: linea.cantidad_descontada };
            return [{ item: insumo, cantidad: String(linea.cantidad_usada) }];
          })
          : sugeridos.flatMap((sugerido) => {
          const item = catalogoPorId.get(sugerido.item_id);
          return [{
            item: item ? { ...item, stock_actual: sugerido.disponible } : sugerido,
            cantidad: String(sugerido.cantidad_por_sesion),
          }];
          });
        setInsumos(iniciales);
      } catch {
        if (!controller.signal.aborted) {
          // El registro de una atención no debe quedar condicionado a la disponibilidad del catálogo.
          setCatalogo([]);
          setInsumos([]);
        }
      } finally {
        if (!controller.signal.aborted) setEstadoCatalogo('ready');
      }
    };
    void cargar();
    return () => controller.abort();
  }, [reservaId, reserva, atencion]);

  useEffect(() => {
    if (!reserva || nombre.trim().length < 2) {
      setSugerencias([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const workplace = getStoredAdminWorkplace();
          let localId = workplace?.local_id;
          if (!localId) {
            const locales = await getLocalesDB();
            localId = locales.data?.locales.find((local) => local.nombre === reserva.local)?.id;
          }
          const personal = await getPersonalSugerido(nombre, controller.signal);
          if (controller.signal.aborted) return;
          // La API limita por local asignado al usuario. Para usuarios con acceso a varios
          // locales, acotamos las sugerencias al local de esta reserva desde el formulario.
          setSugerencias(localId
            ? personal.filter((item) => item.local_id == null || item.local_id === localId)
            : personal);
        } catch {
          if (!controller.signal.aborted) setSugerencias([]);
        }
      })();
    }, 250);

    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [nombre, reserva]);

  const agregados = useMemo(() => new Set(insumos.map((linea) => idInsumo(linea.item))), [insumos]);
  const opciones = useMemo(() => {
    const query = busqueda.trim().toLocaleLowerCase();
    if (!query) return [];
    return catalogo
      .filter((item) => !agregados.has(item.id))
      .filter((item) => `${item.nombre} ${item.codigo} ${item.categoria_nombre ?? ''}`.toLocaleLowerCase().includes(query))
      .slice(0, 10);
  }, [agregados, busqueda, catalogo]);

  const faltantes = useMemo(() => insumos.flatMap((linea) => {
    const cantidad = Number(linea.cantidad);
    const stock = stockInsumo(linea.item);
    return cantidad > stock ? [{ nombre: nombreInsumo(linea.item), cantidad, stock, unidad: linea.item.unidad_medida }] : [];
  }), [insumos]);

  const guardar = async (confirmarStockInsuficiente = false) => {
    if (!reserva) return;
    if (estadoCatalogo !== 'ready') return;
    if (!nombre.trim() || !fecha || !lugar.trim()) {
      setError('Completa quién atendió, la fecha y el lugar.');
      return;
    }
    if (inicio && fin && fin <= inicio) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    if (!confirmarStockInsuficiente && faltantes.length > 0) {
      setConfirmacionStock(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const datosAtencion = {
        ...(empleadoId ? { empleado_id: empleadoId } : {}),
        empleado_nombre: nombre.trim(),
        fecha_atencion: fecha,
        ...(inicio ? { hora_inicio: inicio } : {}),
        ...(fin ? { hora_fin: fin } : {}),
        lugar: lugar.trim(),
        ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
        insumos: insumos.flatMap((linea) => Number(linea.cantidad) > 0
          ? [{ item_id: idInsumo(linea.item), cantidad: Number(linea.cantidad) }]
          : []),
        ...(confirmarStockInsuficiente ? { confirmar_stock_insuficiente: true } : {}),
      };
      const resultado = atencion
        ? await actualizarAtencion(atencion.id, datosAtencion)
        : await registrarAtencion(reserva.id, datosAtencion);
      const pendientes = resultado.insumos.filter((item) => item.estado_descuento === 'PENDIENTE_STOCK').length;
      toast.success(pendientes > 0
        ? `${atencion ? 'Atención actualizada' : 'Atención registrada'}; ${pendientes} insumo(s) quedaron pendientes de descuento. Revisa el stock registrado.`
        : atencion ? 'Atención actualizada.' : 'Atención registrada y reserva completada.');
      setConfirmacionStock(false);
      onSaved();
      onClose();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo registrar la atención.';
      setError(message);
      setConfirmacionStock(false);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const agregarInsumo = (item: InventarioItem) => {
    setInsumos((actuales) => [...actuales, { item, cantidad: '1' }]);
    setBusqueda('');
  };

  const actualizarCantidad = (itemId: number, cantidad: string) => {
    setInsumos((actuales) => actuales.map((linea) => idInsumo(linea.item) === itemId ? { ...linea, cantidad } : linea));
  };

  const ajustarCantidad = (itemId: number, cambio: number) => {
    setInsumos((actuales) => actuales.map((linea) => {
      if (idInsumo(linea.item) !== itemId) return linea;
      const actual = Number(linea.cantidad) || 0;
      return { ...linea, cantidad: String(Math.max(0, actual + cambio)) };
    }));
  };

  return (
    <>
      <FormModal
        isOpen={!!reserva}
        onClose={onClose}
        title={`${atencion ? 'Editar atención' : 'Registrar atención'} · Reserva #${reserva?.id ?? ''}`}
        onSubmit={() => void guardar()}
        submitLabel={atencion ? 'Guardar cambios' : 'Registrar atención'}
        submitDisabled={estadoCatalogo !== 'ready'}
        loading={loading}
        size="lg"
      >
        {reserva && (
          <div className={styles.summary}>
            <strong>{reserva.cliente}</strong>
            <span>{reserva.servicio_confirmado || reserva.servicio}</span>
            <span>{reserva.fecha} · {reserva.hora_desde}–{reserva.hora_hasta} · {reserva.local}</span>
          </div>
        )}

        <FormGrid>
          <FormField label="Lugar" htmlFor="at-lugar" required wide>
            <input id="at-lugar" value={lugar} readOnly={lugarBloqueado} onChange={(event) => setLugar(event.target.value)} />
          </FormField>
          <FormField label="Quien lo atendió" htmlFor="at-empleado" required hint="Escribe un nombre o elige una sugerencia.">
            <div className={styles.autocomplete}>
              <input
                id="at-empleado"
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={sugerencias.length > 0}
                aria-controls="at-personal-sugerido"
                value={nombre}
                onChange={(event) => { setNombre(event.target.value); setEmpleadoId(undefined); setSugerencias([]); }}
                placeholder="Nombre del personal"
              />
              {sugerencias.length > 0 && (
                <div id="at-personal-sugerido" className={styles.suggestions} role="listbox">
                  {sugerencias.map((item) => (
                    <button type="button" role="option" aria-selected={empleadoId === item.id} key={item.id}
                      onClick={() => { setNombre(item.nombre); setEmpleadoId(item.id); setSugerencias([]); }}>
                      {item.nombre}{item.cargo ? ` · ${item.cargo}` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Fecha de atención" htmlFor="at-fecha" required>
            <input id="at-fecha" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
          </FormField>
          <FormField label="Hora de inicio" htmlFor="at-inicio">
            <input id="at-inicio" type="time" value={inicio} onChange={(event) => setInicio(event.target.value)} />
          </FormField>
          <FormField label="Hora de fin" htmlFor="at-fin">
            <input id="at-fin" type="time" value={fin} onChange={(event) => setFin(event.target.value)} />
          </FormField>
          <FormField label="Observaciones" htmlFor="at-observaciones" wide>
            <textarea id="at-observaciones" rows={3} value={observaciones} onChange={(event) => setObservaciones(event.target.value)} placeholder="Opcional" />
          </FormField>
        </FormGrid>

        <section className={styles.supplies} aria-busy={estadoCatalogo === 'loading'}>
          <h3><strong>Insumos utilizados</strong></h3>
          {estadoCatalogo === 'loading' && <p role="status">Cargando insumos…</p>}
          {estadoCatalogo === 'ready' && (
            <>
              <div className={styles.searchWrap}>
                <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar insumo…" aria-label="Buscar insumo" />
                {opciones.length > 0 && (
                  <div className={styles.searchResults} role="listbox">
                    <div className={styles.searchResultHeader} aria-hidden="true">
                      <span>Insumo</span>
                      <span>STOCK</span>
                    </div>
                    {opciones.map((item) => (
                      <button type="button" role="option" aria-selected={false} className={styles.searchResultRow} key={item.id} onClick={() => agregarInsumo(item)}>
                        <span>{item.nombre}</span>
                        <strong>{cantidadLabel(item.stock_actual)} {item.unidad_medida}</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {insumos.length === 0 && !busqueda.trim() && <p>No se usaron servicios en esta atención</p>}
              {insumos.length > 0 && (
                <>
                  <div className={styles.supplyColumns} aria-hidden="true">
                    <span>Insumo</span>
                    <span>Stock</span>
                    <span>Cantidad</span>
                    <span />
                  </div>
                  <div className={styles.supplyList}>
                    {insumos.map((linea) => {
                      const itemId = idInsumo(linea.item);
                      const itemNombre = nombreInsumo(linea.item);
                      const stock = stockInsumo(linea.item);
                      const cantidad = Number(linea.cantidad || 0);
                      const excede = cantidad > stock;
                      return (
                        <div className={styles.supply} key={itemId}>
                          <div className={styles.supplyName}>
                            <strong>{itemNombre}</strong>
                            {excede && <span className={styles.stockWarning}>El consumo supera el stock registrado.</span>}
                          </div>
                          <div className={styles.stockCell}>
                            <strong>{cantidadLabel(stock)} {linea.item.unidad_medida}</strong>
                          </div>
                          <div className={styles.quantity}>
                            <div className={styles.qtyControl}>
                              <button type="button" onClick={() => ajustarCantidad(itemId, -1)} aria-label={`Reducir cantidad de ${itemNombre}`}>
                                <Minus size={13} strokeWidth={2.1} />
                              </button>
                              <input aria-label={`Cantidad de ${itemNombre}`} type="number" min="0" step="0.001" value={linea.cantidad}
                                onChange={(event) => actualizarCantidad(itemId, event.target.value)} />
                              <button type="button" onClick={() => ajustarCantidad(itemId, 1)} aria-label={`Aumentar cantidad de ${itemNombre}`}>
                                <Plus size={13} strokeWidth={2.1} />
                              </button>
                            </div>
                          </div>
                          <button type="button" className={styles.removeSupply} onClick={() => setInsumos((actuales) => actuales.filter((x) => idInsumo(x.item) !== itemId))} aria-label={`Quitar ${itemNombre}`} title={`Quitar ${itemNombre}`}>
                            <Trash2 size={15} strokeWidth={1.8} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {error && <p className={styles.error} role="alert">{error}</p>}
      </FormModal>

      <ConfirmDialog
        isOpen={confirmacionStock}
        title="Consumo mayor al stock registrado"
        confirmLabel="Confirmar y registrar"
        loading={loading}
        onClose={() => setConfirmacionStock(false)}
        onConfirm={() => void guardar(true)}
        message={(
          <>
            <p>Se registrará el consumo aunque supere el stock. Revisa el stock registrado para confirmar si requiere un ajuste.</p>
            <ul>{faltantes.map((item) => <li key={item.nombre}>{item.nombre}: consumo {cantidadLabel(item.cantidad)} {item.unidad}, stock {cantidadLabel(item.stock)} {item.unidad}.</li>)}</ul>
          </>
        )}
      />
    </>
  );
}
