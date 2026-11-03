'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  Banknote,
  Building2,
  History,
  CheckCircle2,
  Minus,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  Clock,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { AdminButton, AlertBanner, PageHeader, FormModal, Tabs, TipoPagoSelector } from '@/components/AdminConfig';
import { CobroReservaLoader } from './CobroReservaLoader';
import type { ReservaBD } from '@/types/reserva';
import { toast } from '@/components/Shared/Toast';
import { crearClienteDB, getClientesDB } from '@/lib/api/clientes';
import type { ClientePG } from '@/lib/api/clientes';
import { PhoneInput } from '@/components/PhoneInput';
import { ClienteFormModal } from '@/components/AdminClientes';
import { crearPagoDB } from '@/lib/api/pagos';
import type { CrearPagoData, DetalleServicio } from '@/lib/api/pagos';
import { ReservasPorCobrar } from './ReservasPorCobrar';
import { actualizarEstadoReservaDB, actualizarReservaDB } from '@/lib/api/reservas';
import { cobrarCliente, crearCargosLote, getCuentaCliente, type CuentaCliente } from '@/lib/api/cuenta';
import { cargosCobrables } from '@/lib/utils/cobro';
import { tipoCargoTexto } from '@/lib/utils/cuenta';
import { formatFecha } from '@/lib/utils/formatDateTime';
import { metodoValido, resumenTicket, type MetodoCaja } from '@/lib/utils/ticketCuenta';
import { cargosDesdeDetalle } from '@/lib/utils/cuentaCaja';
import { agregarInsumo, prepararDetallePago, parsePrecioPago, subtotalDetallePago, type DetallePagoDraft } from '@/lib/utils/paymentDraft';
import { getInventarioItems } from '@/lib/api/inventario';
import type { InventarioItem } from '@/types/inventario';
import { formatCostoServicio } from '@/lib/utils/serviceCost';
import { CAJA_LOCAL_STORAGE_KEY } from '@/lib/utils/localCaja';
import { getLocalesDB, getServiciosDB, getCombosDB } from '@/lib/api/servicios';
import { cambiarEstadoPlan, crearPlan, cobrarPlan, getPlanesDB } from '@/lib/api/planes';
import type { PlanItem } from '@/lib/api/planes';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import styles from './page.module.css';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import type { TipoPago } from '@/lib/utils/tipoPago';

interface LocalOption {
  id: number;
  nombre: string;
  activo?: boolean;
}

interface ServicioOption {
  id: number;
  nombre: string;
  costo: number | string;
  costo_variable?: boolean;
  categoria?: string;
  activo?: boolean;
}

interface ClienteOption extends ClientePG, Record<string, unknown> {}



interface FormErrors {
  local?: string;
  cliente_nit?: string;
  cliente_nombre?: string;
  detalle?: string;
  submit?: string;
}

interface NewClientForm {
  nombre: string;
  apellido: string;
  numero_telefono: string;
  telefono_e164?: string;
}

interface NewClientErrors {
  nombre?: string;
  apellido?: string;
  numero_telefono?: string;
  submit?: string;
}



const formatMoney = (value: number | string | null | undefined) => `Bs. ${Number(value ?? 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeServicePrice = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return roundMoney(value);
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
};

const getTodayStamp = () => new Date().toLocaleDateString('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/** Ventas netas más deudas anteriores, en centavos exactos: lo que el saldo tendría que cubrir. */
const resumenBase = (ventas: number, cargosAnteriores: number) => Math.round((ventas + cargosAnteriores) * 100) / 100;

const getClienteNombreCompleto = (cliente: ClientePG) => `${cliente.nombre} ${cliente.apellido}`.trim();

const splitClienteNombre = (fullName: string): Pick<NewClientForm, 'nombre' | 'apellido'> => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { nombre: parts[0] ?? '', apellido: '' };
  return {
    nombre: parts.slice(0, -1).join(' '),
    apellido: parts.at(-1) ?? '',
  };
};

const restoreStoredLocal = (locales: LocalOption[]): LocalOption | null => {
  try {
    const stored = localStorage.getItem(CAJA_LOCAL_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { id?: number };
    return locales.find((local) => local.id === parsed.id) ?? null;
  } catch {
    return null;
  }
};

const getScopedLocales = (
  locales: LocalOption[],
  workplace: { local_id: number; nombre_local: string } | null,
): LocalOption[] => {
  if (!workplace) return locales;

  const scoped = locales.filter((local) =>
    local.id === workplace.local_id || local.nombre === workplace.nombre_local
  );

  return scoped.length > 0
    ? scoped
    : [{ id: workplace.local_id, nombre: workplace.nombre_local, activo: true }];
};

export default function CajaPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [locales, setLocales] = useState<LocalOption[]>([]);
  const [selectedLocal, setSelectedLocal] = useState<LocalOption | null>(null);
  const [loadingLocales, setLoadingLocales] = useState(true);
  const [localesError, setLocalesError] = useState<string | null>(null);

  const [servicios, setServicios] = useState<ServicioOption[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [combos, setCombos] = useState<{ id: number; nombre: string; precio_total: number }[]>([]);
  const [loadingCombos, setLoadingCombos] = useState(false);
  // Paquetes agregados al pago; el plan se crea al registrar el pago. Clave = nombre de la línea.
  const [combosVenta, setCombosVenta] = useState<Record<string, { combo_id: number; precio: number }>>({});
  const [insumos, setInsumos] = useState<InventarioItem[]>([]);
  const [loadingInsumos, setLoadingInsumos] = useState(false);
  const [catalogoTab, setCatalogoTab] = useState<'reservas' | 'servicios' | 'paquetes' | 'insumos' | 'cuenta'>('reservas');
  const [serviceQuery, setServiceQuery] = useState('');


  const [clienteNit, setClienteNit] = useState('');
  const [nitPropuesto, setNitPropuesto] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [clientesSugeridos, setClientesSugeridos] = useState<ClienteOption[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [descuento, setDescuento] = useState(0);
  const [tipoPago, setTipoPago] = useState<TipoPago>('qr');
  const [detalle, setDetalle] = useState<DetallePagoDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState<NewClientForm>({
    nombre: '',
    apellido: '',
    numero_telefono: '',
    telefono_e164: undefined,
  });
  const [newClientErrors, setNewClientErrors] = useState<NewClientErrors>({});
  const [savingNewClient, setSavingNewClient] = useState(false);
  // Modo "cobrar reserva": en vez de agregar elementos a un pago nuevo, se elige un plan
  // RESERVADO existente y el pago lo activa (no crea un plan nuevo).
  const [modo, setModo] = useState<'venta' | 'cobrarReserva'>('venta');
  const [planesReservados, setPlanesReservados] = useState<PlanItem[]>([]);
  const [loadingPlanesReservados, setLoadingPlanesReservados] = useState(false);
  const [planReservado, setPlanReservado] = useState<PlanItem | null>(null);
  // Reserva completada que se está cobrando (viene de ?reserva=<id>); el pago queda ligado a ella.
  const [reservaCobro, setReservaCobro] = useState<ReservaBD | null>(null);
  const reservaAplicadaRef = useRef<number | null>(null);
  // Sube al registrar un cobro para que la lista de reservas por cobrar se lea de nuevo.
  const [recargaReservas, setRecargaReservas] = useState(0);
  // Cuenta del cliente elegido: saldo disponible y deudas que se pueden cobrar desde la caja.
  const [cuentaLeida, setCuentaLeida] = useState<{ clienteId: number; cuenta: CuentaCliente } | null>(null);
  // Deudas anteriores que se pagan en este ticket y recarga de saldo, ambas del cliente elegido.
  const [cargosElegidos, setCargosElegidos] = useState<number[]>([]);
  const [recargaElegida, setRecargaElegida] = useState<{ clienteId: number; monto: number } | null>(null);
  const [recargaTexto, setRecargaTexto] = useState('');
  // saldo / a_cuenta cuando no paga con uno de los cuatro metodos; null = paga con el metodo de tipoPago.
  const [nuevoClienteAbierto, setNuevoClienteAbierto] = useState(false);
  const [modoCuenta, setModoCuenta] = useState<'saldo' | null>(null);
  // Paquetes ya creados al dejar el ticket a cuenta, por nombre de linea: si el lote de cargos falla y se reintenta,
  // no se crean dos veces.
  const planesACuentaRef = useRef<Record<string, number>>({});
  const adminLocalScope = useAdminLocalScopeState();
  const scopedWorkplace = adminLocalScope.workplace;
  const hasScopedLocal = !!scopedWorkplace;

  const fetchLocales = useCallback(async () => {
    if (!adminLocalScope.ready) return;

    setLoadingLocales(true);
    setLocalesError(null);
    try {
      const res = await getLocalesDB();
      const activeLocales = getScopedLocales(
        (res?.data?.locales ?? []).filter((local) => local.activo !== false),
        scopedWorkplace,
      );
      setLocales(activeLocales);

      const restored = !hasScopedLocal ? restoreStoredLocal(activeLocales) : null;
      const nextLocal = restored ?? (hasScopedLocal ? activeLocales[0] ?? null : null);
      setSelectedLocal(nextLocal);
      if (nextLocal) localStorage.setItem(CAJA_LOCAL_STORAGE_KEY, JSON.stringify(nextLocal));
    } catch (err) {
      setLocalesError(err instanceof Error ? err.message : 'Error al cargar locales');
    } finally {
      setLoadingLocales(false);
    }
  }, [adminLocalScope.ready, hasScopedLocal, scopedWorkplace]);

  const fetchServicios = useCallback(async (local: LocalOption) => {
    setLoadingServicios(true);
    try {
      const res = await getServiciosDB({ local: local.nombre });
      setServicios((res?.data?.servicios ?? []).filter((servicio) => servicio.activo !== false));
    } catch {
      setServicios([]);
      toast.error('No se cargaron los servicios del local');
    } finally {
      setLoadingServicios(false);
    }
  }, []);

  const fetchCombos = useCallback(async (local: LocalOption) => {
    setLoadingCombos(true);
    try {
      const res = await getCombosDB({ local: local.nombre }) as {
        data?: { combos?: { id: number; nombre: string; costo_total: string; precio_paquete?: number }[] };
      };
      setCombos((res?.data?.combos ?? []).map((c) => ({
        id: c.id,
        nombre: c.nombre,
        precio_total: Number(c.precio_paquete ?? c.costo_total ?? 0),
      })));
    } catch {
      setCombos([]);
    } finally {
      setLoadingCombos(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClienteId) return;
    const clienteId = selectedClienteId;
    const controller = new AbortController();
    getCuentaCliente(clienteId, false, controller.signal)
      .then((cuenta) => { if (!controller.signal.aborted) setCuentaLeida({ clienteId, cuenta }); })
      .catch(() => { if (!controller.signal.aborted) setCuentaLeida(null); });
    return () => controller.abort();
  }, [selectedClienteId, recargaReservas]);

  const fetchInsumos = useCallback(async (local: LocalOption) => {
    setLoadingInsumos(true);
    try {
      setInsumos(await getInventarioItems({ local_id: local.id, activo: true, limit: 500 }));
    } catch {
      setInsumos([]);
      toast.error('No se cargaron los insumos del local');
    } finally {
      setLoadingInsumos(false);
    }
  }, []);


  useEffect(() => {
    if (!adminLocalScope.ready) return;

    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
      return;
    }
    void fetchLocales();
  }, [adminLocalScope.ready, router, fetchLocales]);

  useEffect(() => {
    if (!selectedLocal) return;
    void fetchServicios(selectedLocal);
    void fetchCombos(selectedLocal);
    void fetchInsumos(selectedLocal);
  }, [selectedLocal, fetchServicios, fetchCombos, fetchInsumos]);

  useEffect(() => {
    const query = clienteNombre.trim();
    if (query.length < 2 || selectedClienteId) {
      setClientesSugeridos([]);
      setLoadingClientes(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingClientes(true);
      try {
		const res = await getClientesDB({ busqueda: query, limit: PAGE_LIMIT });
        if (cancelled) return;
        setClientesSugeridos((res.data?.clientes ?? []) as ClienteOption[]);
        setClienteDropdownOpen(true);
      } catch {
        if (!cancelled) setClientesSugeridos([]);
      } finally {
        if (!cancelled) setLoadingClientes(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [clienteNombre, selectedClienteId]);

  useEffect(() => {
    if (modo !== 'cobrarReserva' || !selectedLocal) return;
    const nombre = clienteNombre.trim();
    if (nombre.length < 2) {
      setPlanesReservados([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingPlanesReservados(true);
      try {
		const res = await getPlanesDB({ cliente: nombre, estado: 'RESERVADO', local: selectedLocal.nombre, limit: PAGE_LIMIT });
        if (cancelled) return;
        setPlanesReservados(res.data?.planes ?? []);
      } catch {
        if (!cancelled) setPlanesReservados([]);
      } finally {
        if (!cancelled) setLoadingPlanesReservados(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [modo, clienteNombre, selectedLocal]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.52, ease: 'power3.out' },
      );
    }, containerRef);
    return () => ctx.revert();
  }, [selectedLocal]);

  const handleReservaCargada = useCallback((reserva: ReservaBD) => {
    if (reserva.estado_cobro === 'COBRADA') {
      toast.info(`La reserva #${reserva.id} ya tiene un cobro registrado.`);
      return;
    }
    if (reserva.estado_cobro === 'CUBIERTA_PAQUETE') {
      toast.info(`La reserva #${reserva.id} la cubre un paquete: no hay nada que cobrar.`);
      return;
    }
    reservaAplicadaRef.current = null;
    setReservaCobro(reserva);
  }, []);
  const handleReservaError = useCallback(() => toast.error('No se pudo cargar la reserva a cobrar.'), []);

  useEffect(() => {
    const reserva = reservaCobro;
    if (!reserva || reservaAplicadaRef.current === reserva.id) return;
    const local = locales.find((l) => l.nombre === reserva.local);
    if (!local) return;
    if (selectedLocal?.id !== local.id) {
      localStorage.setItem(CAJA_LOCAL_STORAGE_KEY, JSON.stringify(local));
      setSelectedLocal(local);
      return;
    }
    if (loadingServicios) return;

    reservaAplicadaRef.current = reserva.id;
    const nombreServicio = reserva.servicio_confirmado || reserva.servicio || 'Servicio';
    const servicio = servicios.find((item) => item.nombre.trim().toLowerCase() === nombreServicio.trim().toLowerCase());
    const precio = reserva.precio ?? (servicio && !servicio.costo_variable ? Number(servicio.costo) : null);
    setDetalle([{
      servicio_id: servicio?.id ?? null,
      servicio: nombreServicio,
      precio_unitario: precio ?? '',
      cantidad: 1,
      subtotal: precio === null ? null : subtotalDetallePago(1, precio),
    }]);
    setClienteNombre(reserva.cliente);
    setSelectedClienteId(reserva.cliente_id ?? null);
    setClienteNit('');
    // Si el cliente está registrado, se enlaza (por teléfono o nombre exacto) para heredar su NIT.
    void getClientesDB({ busqueda: reserva.cliente, limit: PAGE_LIMIT })
      .then((res) => {
        const lista = res?.data?.clientes ?? [];
        const digitos = (reserva.numero_telefono ?? '').replace(/\D/g, '');
        const encontrado = lista.find((c) => digitos && (c.numero_telefono ?? '').replace(/\D/g, '') === digitos)
          ?? lista.find((c) => getClienteNombreCompleto(c).trim().toLowerCase() === reserva.cliente.trim().toLowerCase());
        if (encontrado) selectCliente(encontrado as ClienteOption);
      })
      .catch(() => { /* sin cliente registrado: se cobra con el nombre de la reserva */ });
  }, [reservaCobro, locales, selectedLocal, loadingServicios, servicios]); // eslint-disable-line react-hooks/exhaustive-deps

  const quitarReservaCobro = () => {
    setReservaCobro(null);
    reservaAplicadaRef.current = null;
    resetSale();
    router.replace('/atrevida-gestion/caja');
  };

  const selectLocal = (local: LocalOption) => {
    if (scopedWorkplace && local.id !== scopedWorkplace.local_id && local.nombre !== scopedWorkplace.nombre_local) {
      toast.error('Tu sesiÃ³n estÃ¡ limitada a un local');
      return;
    }

    localStorage.setItem(CAJA_LOCAL_STORAGE_KEY, JSON.stringify(local));
    setSelectedLocal(local);
    setDetalle([]);
    setFormErrors({});
  };

  const subtotal = useMemo(
    () => detalle.reduce((sum, item) => sum + Number(item.subtotal ?? 0), 0),
    [detalle],
  );
  const totalFinal = Math.max(0, subtotal - descuento);
  const tienePreciosPendientes = detalle.some((item) => item.subtotal === null);

  const cuenta = selectedClienteId && cuentaLeida?.clienteId === selectedClienteId ? cuentaLeida.cuenta : null;
  const disponible = cuenta?.saldo.disponible ?? 0;
  const cargosPorPagar = useMemo(() => cargosCobrables(cuenta?.cargos ?? []), [cuenta]);
  const cargosEnTicket = cargosPorPagar.filter((c) => cargosElegidos.includes(c.id));
  const cargosAnteriores = Math.round(cargosEnTicket.reduce((suma, c) => suma + c.pendiente, 0) * 100) / 100;
  const hayLineaRecarga = !!selectedClienteId && recargaElegida?.clienteId === selectedClienteId;
  const recarga = hayLineaRecarga && recargaElegida ? recargaElegida.monto : 0;
  const hayCliente = !!selectedClienteId;
  const contextoMetodo = { hayCliente, disponible, total: resumenBase(totalFinal, cargosAnteriores), cargosAnteriores, recarga };
  // Si el metodo elegido deja de valer (p. ej. se agrega una recarga), se vuelve al metodo normal.
  const metodoActual: MetodoCaja = modoCuenta && metodoValido(modoCuenta, contextoMetodo) ? modoCuenta : tipoPago;
  const resumen = resumenTicket({ ventas: totalFinal, cargosAnteriores, recarga, disponible, metodo: metodoActual });
  // Saldo siempre se ve; se puede elegir solo si el saldo del cliente cubre todo el ticket.
  const saldoValido = metodoValido('saldo', contextoMetodo);
  const extrasMetodo = [{
    value: 'saldo' as const,
    label: 'Saldo',
    icon: <Wallet size={16} strokeWidth={1.8} />,
    disabled: !saldoValido,
    title: !hayCliente
      ? 'Elige un cliente para pagar con su saldo'
      : recarga > 0
        ? 'No se puede pagar con saldo mientras haya una recarga en el ticket'
        : saldoValido ? undefined : `Saldo insuficiente: tiene ${formatMoney(disponible)}`,
  }];
  const cambiarMetodo = (valor: MetodoCaja) => {
    if (valor === 'saldo') {
      setModoCuenta('saldo');
    } else if (valor !== 'a_cuenta') {
      setModoCuenta(null);
      setTipoPago(valor);
    }
  };
  // A cuenta es un boton aparte: siempre se ve, se habilita con cliente y ventas, sin recarga ni deudas anteriores.
  const puedeDejarACuenta = modo === 'venta' && detalle.length > 0 && metodoValido('a_cuenta', contextoMetodo);
  const tab = catalogoTab === 'cuenta' && !selectedClienteId ? 'reservas' : catalogoTab;
  const alternarCargo = (id: number) =>
    setCargosElegidos((actuales) => (actuales.includes(id) ? actuales.filter((x) => x !== id) : [...actuales, id]));
  const agregarRecarga = () => {
    const monto = Number(recargaTexto.trim().replace(',', '.'));
    if (!selectedClienteId || !Number.isFinite(monto) || monto <= 0) {
      toast.error('Ingresa un monto de recarga mayor a 0');
      return;
    }
    setRecargaElegida({ clienteId: selectedClienteId, monto: Math.round(monto * 100) / 100 });
    setRecargaTexto('');
  };

  const serviciosFiltrados = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    if (!query) return servicios.slice(0, 12);
    return servicios
      .filter((servicio) => `${servicio.nombre} ${servicio.categoria ?? ''}`.toLowerCase().includes(query))
      .slice(0, 18);
  }, [servicios, serviceQuery]);

  const combosFiltrados = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    if (!query) return combos;
    return combos.filter((combo) => combo.nombre.toLowerCase().includes(query));
  }, [combos, serviceQuery]);

  const insumosFiltrados = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    if (!query) return insumos;
    return insumos.filter((item) => item.nombre.toLowerCase().includes(query));
  }, [insumos, serviceQuery]);

  const clearFieldError = (field: keyof FormErrors) => {
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const addDetalle = (servicio: ServicioOption) => {
    const precio = servicio.costo_variable === true ? null : normalizeServicePrice(servicio.costo);
    setDetalle((prev) => {
      const existing = prev.findIndex((item) => item.servicio_id === servicio.id);
      if (existing >= 0) {
        return prev.map((item, index) => {
          if (index !== existing) return item;
          const cantidad = item.cantidad + 1;
          return { ...item, cantidad, subtotal: subtotalDetallePago(cantidad, item.precio_unitario) };
        });
      }
      return [
        ...prev,
        {
          servicio_id: servicio.id,
          servicio: servicio.nombre,
          precio_unitario: precio,
          cantidad: 1,
          subtotal: precio,
        },
      ];
    });
    clearFieldError('detalle');
  };

  const addInsumo = (insumo: InventarioItem) => {
    setDetalle((prev) => agregarInsumo(prev, insumo));
    clearFieldError('detalle');
  };

  const handleAgregarCombo = (combo: { id: number; nombre: string; precio_total: number }) => {
    const nombreLinea = `Paquete: ${combo.nombre}`;
    setDetalle((prev) =>
      prev.some((i) => i.servicio === nombreLinea)
        ? prev
        : [...prev, { servicio_id: null, servicio: nombreLinea, precio_unitario: combo.precio_total, cantidad: 1, subtotal: combo.precio_total }],
    );
    setCombosVenta((prev) => ({ ...prev, [nombreLinea]: { combo_id: combo.id, precio: combo.precio_total } }));
    clearFieldError('detalle');
  };

  const updateCantidad = (index: number, cantidad: number) => {
    const safeCantidad = Number.isFinite(cantidad) ? Math.max(1, Math.floor(cantidad)) : 1;
    setDetalle((prev) => prev.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, cantidad: safeCantidad, subtotal: subtotalDetallePago(safeCantidad, item.precio_unitario) }
        : item
    )));
  };

  const updatePrecioUnitario = (index: number, value: string) => {
    setDetalle((prev) => prev.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, precio_unitario: value, subtotal: subtotalDetallePago(item.cantidad, value) }
        : item
    )));
    clearFieldError('detalle');
  };

  const removeDetalle = (index: number) => {
    setDetalle((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const resetSale = () => {
    planesACuentaRef.current = {};
    setCargosElegidos([]);
    setRecargaElegida(null);
    setRecargaTexto('');
    setModoCuenta(null);
    setClienteNit('');
    setNitPropuesto(false);
    setClienteNombre('');
    setSelectedClienteId(null);
    setClientesSugeridos([]);
    setClienteDropdownOpen(false);
    setDescuento(0);
    setTipoPago('qr');
    setDetalle([]);
    setCombosVenta({});
    setFormErrors({});
    setPlanReservado(null);
    setPlanesReservados([]);
  };

  const handleModoChange = (nextModo: 'venta' | 'cobrarReserva') => {
    if (nextModo === modo) return;
    setModo(nextModo);
    setDetalle([]);
    setCombosVenta({});
    setPlanReservado(null);
    setPlanesReservados([]);
    setFormErrors({});
  };

  const handleSelectPlanReservado = (value: string) => {
    const plan = planesReservados.find((p) => String(p.id) === value) ?? null;
    setPlanReservado(plan);
    if (plan) {
      setClienteNombre(plan.cliente);
      setSelectedClienteId(plan.cliente_id ?? null);
      setClienteDropdownOpen(false);
      setDetalle([{
        servicio_id: null,
        servicio: plan.combo_nombre_texto ?? 'Paquete',
        precio_unitario: plan.precio_total,
        cantidad: 1,
        subtotal: plan.precio_total,
      }]);
    } else {
      setDetalle([]);
    }
    clearFieldError('detalle');
  };

  const resetNewClientModal = () => {
    setNewClientModalOpen(false);
    setNewClientForm({ nombre: '', apellido: '', numero_telefono: '', telefono_e164: undefined });
    setNewClientErrors({});
  };

  const handleClienteNombreChange = (value: string) => {
    setClienteNombre(value);
    setSelectedClienteId(null);
    setClienteDropdownOpen(value.trim().length >= 2);
    clearFieldError('cliente_nombre');
  };

  const selectCliente = (cliente: ClienteOption) => {
    setSelectedClienteId(cliente.id);
    setClienteNombre(getClienteNombreCompleto(cliente));
    // Sobrescribe siempre, no "solo si esta vacio": con la regla condicional el
    // NIT del cliente A se quedaria pegado al elegir despues al cliente B, y se
    // facturaria mal sin que nadie lo note.
    setClienteNit(cliente.nit ?? '');
    // El hint solo es verdad mientras el valor en el campo sea el propuesto:
    // se marca aqui y se apaga en cuanto el operador edita el input a mano.
    setNitPropuesto(!!cliente.nit);
    setClienteDropdownOpen(false);
    setClientesSugeridos([]);
    clearFieldError('cliente_nombre');
    clearFieldError('cliente_nit');
  };

  const openNewClientModal = () => {
    const parsed = splitClienteNombre(clienteNombre);
    setNewClientForm({
      nombre: parsed.nombre,
      apellido: parsed.apellido,
      numero_telefono: '',
      telefono_e164: undefined,
    });
    setNewClientErrors({});
    setNewClientModalOpen(true);
  };

  const validate = () => {
    const errors: FormErrors = {};
    if (!selectedLocal) errors.local = 'Selecciona un local para abrir caja';
    if (!clienteNombre.trim()) errors.cliente_nombre = 'El nombre del cliente es obligatorio';
    if (detalle.length === 0 && (modo === 'cobrarReserva' || (cargosEnTicket.length === 0 && !hayLineaRecarga))) {
      errors.detalle = modo === 'cobrarReserva'
        ? 'Selecciona un paquete reservado para cobrar'
        : 'Agrega al menos un servicio';
    }
    if (modo === 'venta' && hayLineaRecarga && recarga <= 0) errors.detalle = 'La recarga debe ser mayor a 0';
    const { errorIndex } = prepararDetallePago(detalle);
    if (errorIndex !== null) {
      const item = detalle[errorIndex];
      errors.detalle = parsePrecioPago(item.precio_unitario) === null
        ? `Ingresa un precio unitario válido para "${item.servicio}". El campo es obligatorio.`
        : `Revisa la cantidad y el subtotal de "${item.servicio}".`;
      document.getElementById(`detalle-pago-precio-${errorIndex}`)?.focus();
    } else if (!Number.isFinite(subtotal) || subtotal > 99999999.99 || !Number.isFinite(descuento) || descuento < 0 || descuento > subtotal) {
      errors.detalle = 'Revisa el subtotal y el descuento del pago.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateNewClient = () => {
    const errors: NewClientErrors = {};
    if (!newClientForm.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!newClientForm.apellido.trim()) errors.apellido = 'Los apellidos son obligatorios';
    if (!newClientForm.numero_telefono.trim()) {
      errors.numero_telefono = 'El celular es obligatorio';
    } else if (!/^\d{7,}$/.test(newClientForm.numero_telefono.replace(/\D/g, ''))) {
      errors.numero_telefono = 'Ingresa al menos 7 dígitos del teléfono';
    } else if (!newClientForm.telefono_e164) {
      errors.numero_telefono = 'El número no es válido para el país seleccionado';
    }
    setNewClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** Una reserva agendada se completa al cobrarla o dejarla a cuenta; si es de un día futuro, antes se adelanta a hoy. */
  const completarReservaDelCobro = async () => {
    let reserva = reservaCobro;
    if (!reserva || reserva.estado !== 'AGENDADO') return;
    const hoy = new Date().toLocaleDateString('en-CA');
    if (reserva.fecha > hoy) {
      await actualizarReservaDB({ id: reserva.id, local: reserva.local, nueva_fecha: hoy });
      reserva = { ...reserva, fecha: hoy };
      setReservaCobro(reserva);
    }
    await actualizarEstadoReservaDB({ id: reserva.id, estado: 'COMPLETADO', causa: 'Ya se brindo el servicio' });
    setReservaCobro({ ...reserva, estado: 'COMPLETADO' });
  };

  const registerPayment = async (clienteId: number | null) => {
    if (!selectedLocal || !validate()) return;
    const detallePreparado = prepararDetallePago(detalle);
    if (detallePreparado.errorIndex !== null) return;
    if (modo === 'cobrarReserva' && !planReservado) {
      toast.error('Selecciona un paquete reservado para cobrar.');
      return;
    }
    // Un paquete nuevo es una membresía: necesita un cliente registrado como dueño.
    const tienePaquete = modo === 'venta' && detalle.some((i) => combosVenta[i.servicio]);
    if (tienePaquete && !clienteId) {
      toast.error('Un paquete necesita un cliente registrado. Selecciona o crea el cliente.');
      return;
    }
    setSaving(true);
    setFormErrors({});
    try {
      const payload: CrearPagoData = {
        local_id: selectedLocal.id,
        local_nombre: selectedLocal.nombre,
        cliente_id: clienteId,
        cliente_nit: clienteNit.trim(),
        cliente_nombre: clienteNombre.trim(),
        descuento,
        estado: 'PAGADO',
        tipo_pago: tipoPago,
        activo: true,
        reserva_id: modo === 'venta' ? reservaCobro?.id ?? null : null,
        detalle: detallePreparado.detalle,
      };
      // Si completar la reserva falla, no se registra el pago.
      if (modo === 'venta') await completarReservaDelCobro();
      const pagoRes = await crearPagoDB(payload);
      const codigoPago = pagoRes.data?.codigo_pago;

      if (modo === 'cobrarReserva' && planReservado) {
        // La reserva ya existe como plan RESERVADO: solo se le adjunta el pago
        // recién creado, lo que la activa (no se crea un plan nuevo).
        if (codigoPago) {
          try {
            await cobrarPlan(planReservado.id, codigoPago);
          } catch (err) {
            if (err instanceof Error) console.error('cobrar reserva tras pago', err);
            toast.error('El pago se registró, pero la reserva no se activó. Actívala en Paquetes.');
          }
        }
      } else {
        // Crear el paquete (ya ACTIVO) de cada línea de paquete que quedó en el detalle del pago.
        // Nace ACTIVO porque ya está pagado: el cliente puede usar sus sesiones de inmediato.
        // Se pasa el código del pago para aplicarlo a la cuota (queda PAGADO).
        const paquetes = detalle.filter((i) => i.servicio_id === null && combosVenta[i.servicio]);
        if (paquetes.length > 0 && clienteId) {
          try {
            await Promise.all(
              paquetes.map((i) => crearPlan({ combo_id: combosVenta[i.servicio].combo_id, cliente_id: clienteId, local_id: selectedLocal.id, tipo_pago: 'UNICO', pago_codigo: codigoPago })),
            );
          } catch (err) {
            if (err instanceof Error) console.error('crear paquete tras pago', err);
            toast.error('El pago se registró, pero un paquete no se creó. Créalo en Paquetes.');
          }
        }
      }

      toast.success(modo === 'cobrarReserva' ? 'Paquete cobrado y activado' : reservaCobro ? `Reserva #${reservaCobro.id} cobrada` : 'Pago registrado en caja');
      if (reservaCobro) {
        setReservaCobro(null);
        reservaAplicadaRef.current = null;
        router.replace('/atrevida-gestion/caja');
      }
      resetSale();
      setRecargaReservas((n) => n + 1);
      if (detalle.some((i) => i.item_id != null)) void fetchInsumos(selectedLocal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar pago';
      setFormErrors({ submit: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /** Crea los cargos de las ventas del ticket: completa la reserva, activa los paquetes y devuelve los ids. */
  const crearCargosDelTicket = async (local: LocalOption, clienteId: number, lineas: DetalleServicio[]): Promise<number[]> => {
    await completarReservaDelCobro();

    // Un paquete nace activo: el cliente ya puede usar sus sesiones y el cargo queda ligado a su plan.
    for (const linea of lineas) {
      const combo = combosVenta[linea.servicio];
      if (!combo || planesACuentaRef.current[linea.servicio]) continue;
      const plan = await crearPlan({ combo_id: combo.combo_id, cliente_id: clienteId, local_id: local.id, tipo_pago: 'UNICO' });
      await cambiarEstadoPlan(plan.data.id, 'ACTIVO');
      planesACuentaRef.current[linea.servicio] = plan.data.id;
    }

    return crearCargosLote(clienteId, cargosDesdeDetalle(lineas, {
      descuento,
      localId: local.id,
      reservaId: reservaCobro?.id ?? null,
      esPaquete: (linea) => !!combosVenta[linea.servicio],
      planPorLinea: planesACuentaRef.current,
    }));
  };

  /** Deja el ticket listo para el siguiente cliente despues de pasar por la cuenta. */
  const terminarTicketDeCuenta = (local: LocalOption, mensaje: string) => {
    toast.success(mensaje);
    if (reservaCobro) {
      setReservaCobro(null);
      reservaAplicadaRef.current = null;
      router.replace('/atrevida-gestion/caja');
    }
    const vendioInsumos = detalle.some((i) => i.item_id != null);
    resetSale();
    setRecargaReservas((n) => n + 1);
    if (vendioInsumos) void fetchInsumos(local);
  };

  /**
   * Registra el ticket por la cuenta del cliente: las ventas se vuelven cargos (los insumos bajan stock) y despues se
   * cobra todo junto con saldo y/o un metodo, o se deja a cuenta sin mover dinero. Tambien paga deudas anteriores y
   * recarga saldo. Si algo falla antes de crear los cargos, no queda ninguno.
   */
  const registrarPorCuenta = async (aCuenta = false) => {
    if (!selectedLocal || !selectedClienteId || modo !== 'venta') return;
    const detallePreparado = prepararDetallePago(detalle);
    if (detallePreparado.errorIndex !== null) return;
    const local = selectedLocal;
    const clienteId = selectedClienteId;
    setSaving(true);
    setFormErrors({});
    try {
      const nuevos = detallePreparado.detalle.length > 0 ? await crearCargosDelTicket(local, clienteId, detallePreparado.detalle) : [];
      if (aCuenta) {
        terminarTicketDeCuenta(local, `Dejado a cuenta de ${clienteNombre.trim()}`);
        return;
      }
      try {
        await cobrarCliente(clienteId, {
          local_id: local.id,
          local_nombre: local.nombre,
          cargo_ids: [...nuevos, ...cargosEnTicket.map((c) => c.id)],
          usar_saldo: metodoActual === 'saldo',
          recarga: recarga > 0 ? recarga : undefined,
          tipo_pago: resumen.aPagarAhora > 0 ? tipoPago : undefined,
        });
      } catch (err) {
        if (nuevos.length === 0) throw err;
        // Los cargos ya existen: quedaron a cuenta y se pueden cobrar desde la ficha del cliente.
        const motivo = err instanceof Error ? err.message : 'error desconocido';
        toast.error(`Quedó a cuenta, pero el cobro falló: ${motivo}. Cóbralo desde la ficha del cliente.`);
        terminarTicketDeCuenta(local, `Dejado a cuenta de ${clienteNombre.trim()}`);
        return;
      }
      terminarTicketDeCuenta(local, 'Cobro registrado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo registrar el cobro';
      setFormErrors({ submit: message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate() || !selectedLocal) return;
    if (modo === 'cobrarReserva') {
      await registerPayment(planReservado?.cliente_id ?? selectedClienteId ?? null);
      return;
    }
    if (selectedClienteId && resumen.usaCuenta) {
      await registrarPorCuenta();
      return;
    }
    if (!selectedClienteId) {
      openNewClientModal();
      return;
    }
    await registerPayment(selectedClienteId);
  };

  const handlePayWithoutCreatingClient = async () => {
    resetNewClientModal();
    await registerPayment(null);
  };

  const handleCreateClientAndPay = async () => {
    if (!validateNewClient() || !selectedLocal) return;

    setSavingNewClient(true);
    setNewClientErrors({});
    try {
      const cleanClient = {
        nombre: newClientForm.nombre.trim(),
        apellido: newClientForm.apellido.trim(),
        numero_telefono: newClientForm.numero_telefono.trim(),
        telefono_e164: newClientForm.telefono_e164,
        // El NIT ingresado en el pago pasa a ser el NIT por defecto del
        // cliente nuevo: es el momento natural de capturarlo.
        nit: clienteNit.trim(),
      };
      const res = await crearClienteDB(cleanClient);
      if (!res.data?.id) throw new Error('No se recibió el ID del cliente creado');

      const fullName = `${cleanClient.nombre} ${cleanClient.apellido}`.trim();
      const nuevoClienteId = res.data.id;
      setSelectedClienteId(nuevoClienteId);
      setClienteNombre(fullName);
      setClienteDropdownOpen(false);
      setClientesSugeridos([]);
      setNewClientModalOpen(false);
      toast.success('Cliente creado correctamente');
      await registerPayment(nuevoClienteId);
      resetNewClientModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear cliente';
      setNewClientErrors({ submit: message });
      toast.error(message);
    } finally {
      setSavingNewClient(false);
    }
  };

  return (
    <div ref={containerRef} className="admin-stack">
          <PageHeader
            kicker="Operación diaria"
            kickerIcon={<Banknote size={14} strokeWidth={2} />}
            title="Cobros"
            accentWord="Cobros"
            subtitle={selectedLocal ? `Registrando cobros de ventas en ${selectedLocal.nombre}.` : 'Selecciona el local para registrar el cobro de una venta.'}
            actions={
              <AdminButton variant="secondary" href="/atrevida-gestion/pagos" icon={<History size={16} strokeWidth={1.8} />}>
                Historial de pagos
              </AdminButton>
            }
          />

          <Suspense fallback={null}>
            <CobroReservaLoader onLoad={handleReservaCargada} onError={handleReservaError} />
          </Suspense>

          <div ref={contentRef} className={styles.contentStack}>
            {reservaCobro && (
              <AlertBanner
                tone="info"
                title={`Cobrando la reserva #${reservaCobro.id}`}
                action={<AdminButton variant="secondary" size="sm" onClick={quitarReservaCobro}>Quitar</AdminButton>}
              >
                {reservaCobro.cliente} · {reservaCobro.servicio_confirmado || reservaCobro.servicio} · {reservaCobro.fecha}.
                {reservaCobro.estado === 'AGENDADO'
                  ? ` Al registrar el pago se completa${reservaCobro.fecha > new Date().toLocaleDateString('en-CA') ? ' y pasa a hoy' : ''}. Puedes agregar insumos.`
                  : reservaCobro.estado === 'COMPLETADO'
                    ? ' Revisa el precio y el método de pago; al registrar el pago la reserva queda como cobrada.'
                    : ` Está ${reservaCobro.estado === 'RECHAZADO' ? 'cancelada' : 'pendiente'}: el pago queda a su nombre y su estado no cambia.`}
              </AlertBanner>
            )}
            {!selectedLocal ? (
              <section className={styles.localPicker}>
                <div className={styles.localPickerHeader}>
                  <div>
                    <span className={styles.kicker}>Local actual</span>
                    <h2>Elige dónde abrir caja</h2>
                  </div>
                  {loadingLocales && <span className="admin-badge">Cargando</span>}
                </div>

                {localesError ? (
                  <div className={styles.inlineError}>{localesError}</div>
                ) : (
                  <div className={styles.localGrid}>
                    {locales.map((local) => (
                      <button
                        key={local.id}
                        type="button"
                        className={styles.localCard}
                        onClick={() => selectLocal(local)}
                      >
                        <span className={styles.localIcon}>
                          <Building2 size={20} strokeWidth={1.8} />
                        </span>
                        <span>
                          <strong>{local.nombre}</strong>
                          <small>Registrar y ver pagos de este local</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                <section className={styles.cashSummary}>
                  <div className={styles.summaryItem}>
                    <span>Local</span>
                    <strong>{selectedLocal.nombre}</strong>
                    {!hasScopedLocal && (
                      <button type="button" onClick={() => setSelectedLocal(null)}>Cambiar</button>
                    )}
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Fecha</span>
                    <strong>{getTodayStamp()}</strong>
                  </div>
                </section>

                <Tabs
                  tabs={[
                    { key: 'venta', label: 'Venta nueva', icon: <ReceiptText size={16} strokeWidth={1.8} /> },
                    { key: 'cobrarReserva', label: 'Cobrar paquete reservado', icon: <CheckCircle2 size={16} strokeWidth={1.8} /> },
                  ]}
                  active={modo}
                  onChange={handleModoChange}
                  ariaLabel="Modo de cobro"
                />

                <section className={styles.saleShell}>
                  <div className={styles.catalogPanel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <span className={styles.kicker}>{modo === 'venta' ? 'Catálogo' : 'Cobrar paquete reservado'}</span>
                        <h2>{modo === 'venta' ? 'Agregar al pago' : 'Paquete seleccionado'}</h2>
                      </div>
                      {modo === 'venta'
                        ? (loadingServicios || loadingCombos) && <span className="admin-badge">Cargando</span>
                        : loadingPlanesReservados && <span className="admin-badge">Buscando</span>}
                    </div>

                    {modo === 'cobrarReserva' ? (
                      <div className={styles.catalogBody}>
                        {planReservado ? (
                          <div className={styles.summaryCard}>
                            <div className={styles.summaryRow}>
                              <span>Cliente</span>
                              <strong>{planReservado.cliente}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                              <span>Paquete</span>
                              <strong>{planReservado.combo_nombre_texto ?? '—'}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                              <span>Sesiones</span>
                              <strong>{planReservado.sesiones_totales}</strong>
                            </div>
                            <div className={styles.summaryRow}>
                              <span>Precio</span>
                              <strong>{formatMoney(planReservado.precio_total)}</strong>
                            </div>
                          </div>
                        ) : (
                          <p className={styles.mutedText}>
                            Escribe el nombre del cliente en el panel derecho y elige su paquete reservado para agregarlo al pago.
                          </p>
                        )}
                      </div>
                    ) : (
                    <>
                    <div className={styles.catalogTabs} role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'reservas'}
                        className={`${styles.catalogTab} ${tab === 'reservas' ? styles.catalogTabActive : ''}`}
                        onClick={() => setCatalogoTab('reservas')}
                      >
                        Reservas
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'servicios'}
                        className={`${styles.catalogTab} ${tab === 'servicios' ? styles.catalogTabActive : ''}`}
                        onClick={() => setCatalogoTab('servicios')}
                      >
                        Servicios
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'paquetes'}
                        className={`${styles.catalogTab} ${tab === 'paquetes' ? styles.catalogTabActive : ''}`}
                        onClick={() => setCatalogoTab('paquetes')}
                      >
                        Paquetes
                        {combos.length > 0 && <span className={styles.tabCount}>{combos.length}</span>}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'insumos'}
                        className={`${styles.catalogTab} ${tab === 'insumos' ? styles.catalogTabActive : ''}`}
                        onClick={() => setCatalogoTab('insumos')}
                      >
                        Insumos
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'cuenta'}
                        className={`${styles.catalogTab} ${tab === 'cuenta' ? styles.catalogTabActive : ''}`}
                        onClick={() => setCatalogoTab('cuenta')}
                        disabled={!selectedClienteId}
                        title={selectedClienteId ? undefined : 'Elige un cliente para ver su saldo y sus deudas'}
                      >
                        Cuenta
                        {cargosPorPagar.length > 0 && <span className={styles.tabCount}>{cargosPorPagar.length}</span>}
                      </button>
                    </div>

                    {tab !== 'reservas' && tab !== 'cuenta' && (
                      <div className={styles.searchBox}>
                        <Search size={15} strokeWidth={1.8} />
                        <input
                          type="text"
                          value={serviceQuery}
                          onChange={(e) => setServiceQuery(e.target.value)}
                          placeholder={tab === 'servicios' ? 'Buscar servicio...' : tab === 'paquetes' ? 'Buscar paquete...' : 'Buscar insumo...'}
                        />
                      </div>
                    )}

                    <div className={styles.catalogBody}>
                      {tab === 'reservas' && (
                        <ReservasPorCobrar
                          local={selectedLocal.nombre}
                          clienteId={selectedClienteId}
                          clienteNombre={clienteNombre.trim()}
                          seleccionadaId={reservaCobro?.id ?? null}
                          recarga={recargaReservas}
                          onSeleccionar={handleReservaCargada}
                        />
                      )}

                      {tab === 'cuenta' && selectedClienteId && (
                        <div className={styles.serviceList}>
                          <div className={styles.cuentaResumen}>
                            <div>
                              <span>Saldo disponible</span>
                              <strong>{formatMoney(disponible)}</strong>
                            </div>
                            <div>
                              <span>Debe</span>
                              <strong>{formatMoney(cuenta?.saldo.por_pagar ?? 0)}</strong>
                            </div>
                          </div>
                          {cargosPorPagar.map((cargo) => (
                            <button
                              key={cargo.id}
                              type="button"
                              className={`${styles.serviceItem} ${cargosElegidos.includes(cargo.id) ? styles.serviceItemActive : ''}`}
                              aria-pressed={cargosElegidos.includes(cargo.id)}
                              onClick={() => alternarCargo(cargo.id)}
                            >
                              <span>
                                <strong>{cargo.concepto}</strong>
                                <small>{tipoCargoTexto(cargo.tipo)} · {formatFecha(cargo.fecha_hecho)}</small>
                              </span>
                              <span className={styles.servicePrice}>
                                <b>{formatMoney(cargo.pendiente)}</b>
                                <small>{cargosElegidos.includes(cargo.id) ? 'En el ticket' : 'Por pagar'}</small>
                              </span>
                            </button>
                          ))}
                          {cuenta && cargosPorPagar.length === 0 && <p className={styles.mutedText}>No tiene deudas por pagar.</p>}
                          <div className={styles.recargaFila}>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={recargaTexto}
                              onChange={(e) => setRecargaTexto(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarRecarga(); } }}
                              placeholder="Recargar saldo"
                              aria-label="Monto a recargar"
                            />
                            <button type="button" className="admin-button admin-button-secondary" onClick={agregarRecarga}>
                              <Plus size={16} strokeWidth={2} />
                              Agregar
                            </button>
                          </div>
                        </div>
                      )}

                      {tab === 'servicios' && (
                        <div className={styles.serviceList}>
                          {serviciosFiltrados.map((servicio) => (
                            <button
                              key={servicio.id}
                              type="button"
                              className={styles.serviceItem}
                              onClick={() => addDetalle(servicio)}
                            >
                              <span>
                                <strong>{servicio.nombre}</strong>
                                <small>{servicio.categoria || 'Servicio'}</small>
                              </span>
                              <span className={styles.servicePrice}>
                                <b>{formatCostoServicio(servicio)}</b>
                                <small>{servicio.costo_variable === true ? 'Se define al cobrar' : 'Precio de referencia'}</small>
                              </span>
                            </button>
                          ))}
                          {!loadingServicios && serviciosFiltrados.length === 0 && (
                            <p className={styles.mutedText}>No hay servicios para este filtro.</p>
                          )}
                        </div>
                      )}

                      {tab === 'paquetes' && (
                        <div className={styles.serviceList}>
                          {combosFiltrados.map((combo) => (
                            <button
                              key={combo.id}
                              type="button"
                              className={styles.serviceItem}
                              onClick={() => handleAgregarCombo(combo)}
                              title={`Agregar ${combo.nombre} al pago`}
                            >
                              <span>
                                <strong>{combo.nombre}</strong>
                                <small>Paquete</small>
                              </span>
                              <b>{formatMoney(combo.precio_total)}</b>
                            </button>
                          ))}
                          {!loadingCombos && combosFiltrados.length === 0 && (
                            <p className={styles.mutedText}>
                              {combos.length === 0 ? 'Este local no tiene paquetes.' : 'No hay paquetes para ese filtro.'}
                            </p>
                          )}
                        </div>
                      )}

                      {tab === 'insumos' && (
                        <div className={styles.serviceList}>
                          {insumosFiltrados.map((insumo) => (
                            <button
                              key={insumo.id}
                              type="button"
                              className={styles.serviceItem}
                              onClick={() => addInsumo(insumo)}
                            >
                              <span>
                                <strong>{insumo.nombre}</strong>
                                <small>Stock {insumo.stock_actual}</small>
                              </span>
                              <span className={styles.servicePrice}>
                                <b>{insumo.precio_venta != null ? formatMoney(insumo.precio_venta) : 'Sin precio'}</b>
                              </span>
                            </button>
                          ))}
                          {!loadingInsumos && insumosFiltrados.length === 0 && (
                            <p className={styles.mutedText}>
                              {insumos.length === 0 ? 'Este local no tiene insumos.' : 'No hay insumos para ese filtro.'}
                            </p>
                          )}
                        </div>
                      )}

                    </div>
                    </>
                    )}
                  </div>

                  <div className={styles.ticketPanel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <span className={styles.kicker}>{modo === 'venta' ? 'Nuevo pago' : 'Cobrar paquete reservado'}</span>
                        <h2>{modo === 'venta' ? 'Detalle de caja' : 'Paquete a cobrar'}</h2>
                      </div>
                      <ReceiptText size={22} strokeWidth={1.7} />
                    </div>

                    <div className={styles.clientGrid}>
                      <label>
                        <span>NIT / CI de factura (opcional)</span>
                        <input
                          type="text"
                          value={clienteNit}
                          onChange={(e) => {
                            setClienteNit(e.target.value);
                            setNitPropuesto(false);
                            clearFieldError('cliente_nit');
                          }}
                          className={formErrors.cliente_nit ? styles.inputError : ''}
                          placeholder="NIT o CI si corresponde"
                        />
                        {nitPropuesto && (
                          <small className={styles.nitHint}>
                            Propuesto desde el cliente. Editable para esta venta.
                          </small>
                        )}
                        {formErrors.cliente_nit && <small className={styles.fieldError}>{formErrors.cliente_nit}</small>}
                      </label>
                      <label className={styles.clientAutocomplete}>
                        <span>Nombre cliente</span>
                        <input
                          type="text"
                          value={clienteNombre}
                          onChange={(e) => {
                            handleClienteNombreChange(e.target.value);
                          }}
                          onFocus={() => {
                            if (clienteNombre.trim().length >= 2 && !selectedClienteId) setClienteDropdownOpen(true);
                          }}
                          onBlur={() => window.setTimeout(() => setClienteDropdownOpen(false), 120)}
                          className={formErrors.cliente_nombre ? styles.inputError : ''}
                          placeholder="Nombre completo"
                          autoComplete="off"
                        />
                        {clienteDropdownOpen && (loadingClientes || clientesSugeridos.length > 0 || clienteNombre.trim().length >= 2) && (
                          <div className={styles.clientDropdown} role="listbox" aria-label="Clientes registrados">
                            {loadingClientes ? (
                              <div className={styles.clientDropdownStatus}>Buscando clientes...</div>
                            ) : clientesSugeridos.length > 0 ? (
                              clientesSugeridos.map((cliente) => (
                                <button
                                  key={cliente.id}
                                  type="button"
                                  className={styles.clientOption}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectCliente(cliente);
                                  }}
                                  role="option"
                                  aria-selected={selectedClienteId === cliente.id}
                                >
                                  <strong>{getClienteNombreCompleto(cliente)}</strong>
                                  <span>{cliente.numero_telefono || 'Sin teléfono registrado'}</span>
                                </button>
                              ))
                            ) : (
                              <div className={styles.clientDropdownStatus}>Sin coincidencias registradas</div>
                            )}
                          </div>
                        )}
                        {formErrors.cliente_nombre && <small className={styles.fieldError}>{formErrors.cliente_nombre}</small>}
                        <button type="button" className={styles.nuevoCliente} onClick={() => setNuevoClienteAbierto(true)}>
                          <UserPlus size={13} strokeWidth={2} />
                          Nuevo
                        </button>
                      </label>
                    </div>

                    {cuenta && (
                      <p className={styles.saldoLinea}>
                        Saldo disponible {formatMoney(disponible)}
                        {cuenta.saldo.por_pagar > 0 && <> · Por pagar {formatMoney(cuenta.saldo.por_pagar)}</>}
                      </p>
                    )}

                    {modo === 'cobrarReserva' && (
                      <div className={styles.modalField}>
                        <span>Paquete reservado</span>
                        {loadingPlanesReservados ? (
                          <p className={styles.mutedText}>Buscando paquetes...</p>
                        ) : clienteNombre.trim().length < 2 ? (
                          <p className={styles.mutedText}>Escribe el nombre del cliente para buscar sus paquetes reservados.</p>
                        ) : planesReservados.length === 0 ? (
                          <p className={styles.mutedText}>Este cliente no tiene paquetes reservados pendientes de cobro.</p>
                        ) : (
                          <CustomSelect
                            id="plan-reservado-select"
                            value={planReservado ? String(planReservado.id) : ''}
                            onChange={handleSelectPlanReservado}
                            placeholder="Selecciona el paquete"
                            hasError={!!formErrors.detalle}
                            options={planesReservados.map((p) => ({
                              value: String(p.id),
                              label: `${p.combo_nombre_texto ?? 'Paquete'} — ${p.sesiones_totales} sesiones — ${formatMoney(p.precio_total)}`,
                            }))}
                          />
                        )}
                      </div>
                    )}

                    <div className={styles.paymentToggle}>
                      <TipoPagoSelector value={metodoActual} onChange={cambiarMetodo} label="Cómo paga" extras={extrasMetodo} />
                    </div>

                    <div className={styles.ticketColumns}>
                      <span>Servicio / Producto</span>
                      <span>Precio unitario</span>
                      <span>Cantidad</span>
                      <span>Subtotal</span>
                      <span aria-hidden="true" />
                    </div>
                    <div className={styles.ticketItems}>
                      {detalle.length === 0 && cargosEnTicket.length === 0 && !hayLineaRecarga ? (
                        <div className={styles.emptyTicket}>
                          <ReceiptText size={20} strokeWidth={1.7} />
                          <p>Agrega servicios desde el catálogo para armar el pago.</p>
                        </div>
                      ) : (
                        detalle.map((item, index) => (
                          <div key={`${item.servicio}-${index}`} className={styles.ticketItem}>
                            <div>
                              <strong>{item.servicio}</strong>
                            </div>
                            {modo === 'venta' && !combosVenta[item.servicio] ? (
                              <label className={styles.unitPriceField}>
                                <span className={styles.currencyPrefix}>Bs.</span>
                                <input
                                  id={`detalle-pago-precio-${index}`}
                                  type="number"
                                  min={0}
                                  max={99999999.99}
                                  step="0.01"
                                  inputMode="decimal"
                                  value={item.precio_unitario ?? ''}
                                  placeholder="Obligatorio"
                                  aria-required="true"
                                  aria-invalid={!!formErrors.detalle && parsePrecioPago(item.precio_unitario) === null}
                                  onFocus={(event) => event.currentTarget.select()}
                                  onChange={(event) => updatePrecioUnitario(index, event.target.value)}
                                  aria-label={`Precio unitario de ${item.servicio}`}
                                />
                              </label>
                            ) : (
                              <span className={styles.unitPriceStatic}>{formatMoney(item.precio_unitario)}</span>
                            )}
                            <div className={styles.qtyControl}>
                              <button type="button" onClick={() => updateCantidad(index, item.cantidad - 1)} aria-label="Reducir cantidad">
                                <Minus size={13} strokeWidth={2.1} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.cantidad}
                                onChange={(e) => updateCantidad(index, Number(e.target.value) || 1)}
                                aria-label="Cantidad"
                              />
                              <button type="button" onClick={() => updateCantidad(index, item.cantidad + 1)} aria-label="Aumentar cantidad">
                                <Plus size={13} strokeWidth={2.1} />
                              </button>
                            </div>
                            <b>{item.subtotal === null ? '—' : formatMoney(item.subtotal)}</b>
                            <button type="button" className={styles.iconButton} onClick={() => removeDetalle(index)} aria-label="Quitar servicio">
                              <Trash2 size={15} strokeWidth={1.8} />
                            </button>
                          </div>
                        ))
                      )}
                      {modo === 'venta' && cargosEnTicket.map((cargo) => (
                        <div key={`cargo-${cargo.id}`} className={styles.ticketItem}>
                          <div>
                            <strong>Deuda: {cargo.concepto}</strong>
                          </div>
                          <span />
                          <span />
                          <b>{formatMoney(cargo.pendiente)}</b>
                          <button type="button" className={styles.iconButton} onClick={() => alternarCargo(cargo.id)} aria-label="Quitar deuda">
                            <Trash2 size={15} strokeWidth={1.8} />
                          </button>
                        </div>
                      ))}
                      {modo === 'venta' && hayLineaRecarga && (
                        <div className={styles.ticketItem}>
                          <div>
                            <strong>Recarga de saldo</strong>
                          </div>
                          <label className={styles.unitPriceField}>
                            <span className={styles.currencyPrefix}>Bs.</span>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              inputMode="decimal"
                              value={recarga || ''}
                              placeholder="Monto"
                              aria-label="Monto de la recarga"
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => {
                                const monto = Math.max(0, Number(e.target.value) || 0);
                                if (selectedClienteId) setRecargaElegida({ clienteId: selectedClienteId, monto });
                                clearFieldError('detalle');
                              }}
                            />
                          </label>
                          <span />
                          <b>{formatMoney(recarga)}</b>
                          <button type="button" className={styles.iconButton} onClick={() => setRecargaElegida(null)} aria-label="Quitar recarga">
                            <Trash2 size={15} strokeWidth={1.8} />
                          </button>
                        </div>
                      )}
                    </div>
                    {formErrors.detalle && <small className={styles.fieldError}>{formErrors.detalle}</small>}

                    <div className={styles.totalsPanel}>
                      <div className={styles.totalsRow}>
                        <span>Subtotal</span>
                        <span className={styles.totalsValue}>{tienePreciosPendientes ? '—' : formatMoney(subtotal)}</span>
                      </div>
                      <label className={styles.totalsRow}>
                        <span>Descuento</span>
                        <span className={styles.discountField}>
                          <span>Bs.</span>
                          <input
                            type="number"
                            min={0}
                            value={descuento}
                            onChange={(e) => setDescuento(Math.max(0, Number(e.target.value) || 0))}
                          />
                        </span>
                      </label>
                      {cargosAnteriores > 0 && (
                        <div className={styles.totalsRow}>
                          <span>Deudas anteriores</span>
                          <span className={styles.totalsValue}>{formatMoney(cargosAnteriores)}</span>
                        </div>
                      )}
                      {recarga > 0 && (
                        <div className={styles.totalsRow}>
                          <span>Recarga de saldo</span>
                          <span className={styles.totalsValue}>{formatMoney(recarga)}</span>
                        </div>
                      )}
                      {resumen.usaSaldo > 0 && (
                        <div className={`${styles.totalsRow} ${styles.totalsSaldo}`}>
                          <span>Saldo aplicado</span>
                          <span className={styles.totalsValue}>− {formatMoney(resumen.usaSaldo)}</span>
                        </div>
                      )}
                      <div className={styles.totalFinal}>
                        <span>{resumen.usaCuenta ? 'Paga ahora' : 'Total a cobrar'}</span>
                        <strong>{tienePreciosPendientes ? '—' : formatMoney(resumen.aPagarAhora)}</strong>
                      </div>
                    </div>

                    {formErrors.submit && <div className={styles.submitError}>{formErrors.submit}</div>}

                    <div className={styles.ticketActions}>
                      <button type="button" className="admin-button admin-button-secondary" onClick={resetSale} disabled={saving}>
                        Limpiar
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button-secondary"
                        onClick={() => { if (validate()) void registrarPorCuenta(true); }}
                        disabled={saving || !puedeDejarACuenta}
                        title={!hayCliente ? 'Elige un cliente para dejar el ticket a su cuenta' : 'La deuda se cobra después, desde caja o desde la ficha'}
                      >
                        <Clock size={16} strokeWidth={2} />
                        A cuenta
                      </button>
                      <button type="button" className="admin-button admin-button-primary" onClick={handleSubmit} disabled={saving || (metodoActual === 'saldo' && !saldoValido)}>
                        <CheckCircle2 size={17} strokeWidth={2} />
                        {saving ? 'Registrando...' : modo === 'cobrarReserva' ? 'Cobrar paquete' : resumen.usaCuenta ? 'Registrar cobro' : 'Registrar pago'}
                      </button>
                    </div>
                  </div>
                </section>

              </>
            )}
          </div>

      <ClienteFormModal
        isOpen={nuevoClienteAbierto}
        onClose={() => setNuevoClienteAbierto(false)}
        initialNombre={clienteNombre}
        onSaved={(cliente) => {
          selectCliente(cliente as ClienteOption);
          toast.success('Cliente creado');
        }}
      />

      <FormModal
        isOpen={newClientModalOpen}
        onClose={resetNewClientModal}
        title="Cliente no registrado"
        onSubmit={handleCreateClientAndPay}
        loading={savingNewClient || saving}
        submitLabel="Crear cliente y registrar pago"
      >
        <div className={styles.newClientIntro}>
          El nombre ingresado no corresponde a un cliente seleccionado. Puedes crearlo ahora para asociarlo al pago o continuar solo con el nombre escrito.
        </div>

        <div className={styles.modalFormGrid}>
          <label className={styles.modalField}>
            <span>Nombre</span>
            <input
              type="text"
              value={newClientForm.nombre}
              onChange={(e) => {
                setNewClientForm((prev) => ({ ...prev, nombre: e.target.value }));
                if (newClientErrors.nombre) setNewClientErrors((prev) => ({ ...prev, nombre: undefined }));
              }}
              className={newClientErrors.nombre ? styles.inputError : ''}
              autoFocus
            />
            {newClientErrors.nombre && <small className={styles.fieldError}>{newClientErrors.nombre}</small>}
          </label>

          <label className={styles.modalField}>
            <span>Apellidos</span>
            <input
              type="text"
              value={newClientForm.apellido}
              onChange={(e) => {
                setNewClientForm((prev) => ({ ...prev, apellido: e.target.value }));
                if (newClientErrors.apellido) setNewClientErrors((prev) => ({ ...prev, apellido: undefined }));
              }}
              className={newClientErrors.apellido ? styles.inputError : ''}
            />
            {newClientErrors.apellido && <small className={styles.fieldError}>{newClientErrors.apellido}</small>}
          </label>

          <label className={`${styles.modalField} ${styles.modalFieldFull}`}>
            <span>Celular</span>
            <PhoneInput
              value={newClientForm.numero_telefono}
              e164={newClientForm.telefono_e164}
              onChange={(phone) => {
                setNewClientForm((prev) => ({
                  ...prev,
                  numero_telefono: phone.nationalNumber,
                  telefono_e164: phone.e164,
                }));
                if (newClientErrors.numero_telefono) {
                  setNewClientErrors((prev) => ({ ...prev, numero_telefono: undefined }));
                }
              }}
              invalid={!!newClientErrors.numero_telefono}
              placeholder="Número de celular"
            />
            {newClientErrors.numero_telefono && (
              <small className={styles.fieldError}>{newClientErrors.numero_telefono}</small>
            )}
          </label>
        </div>

        {newClientErrors.submit && <div className={styles.submitError}>{newClientErrors.submit}</div>}

        <button
          type="button"
          className={styles.skipClientButton}
          onClick={handlePayWithoutCreatingClient}
          disabled={savingNewClient || saving}
        >
          Continuar sin registrar cliente
        </button>
      </FormModal>
    </div>
  );
}
