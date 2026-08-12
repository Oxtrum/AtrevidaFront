'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  WalletCards,
} from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal, CursorPagination } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { crearClienteDB, getClientesDB } from '@/lib/api/clientes';
import type { ClientePG } from '@/lib/api/clientes';
import { crearPagoDB, getPagosDB } from '@/lib/api/pagos';
import type { CrearPagoData, DetalleServicio, Pago } from '@/lib/api/pagos';
import { getLocalesDB, getServiciosDB, getCombosDB } from '@/lib/api/servicios';
import { crearPlan, cobrarPlan, getPlanesDB } from '@/lib/api/planes';
import type { PlanItem } from '@/lib/api/planes';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import { formatDateTime } from '@/lib/utils/formatDateTime';
import styles from './page.module.css';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';

interface LocalOption {
  id: number;
  nombre: string;
  activo?: boolean;
}

interface ServicioOption {
  id: number;
  nombre: string;
  costo: number | string;
  categoria?: string;
  activo?: boolean;
}

interface ClienteOption extends ClientePG, Record<string, unknown> {}

interface PagoRow extends Pago, Record<string, unknown> {}

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
}

interface NewClientErrors {
  nombre?: string;
  apellido?: string;
  numero_telefono?: string;
  submit?: string;
}

const CAJA_LOCAL_STORAGE_KEY = 'atrevidaCajaLocal';

const formatMoney = (value: number | string | null | undefined) => `Bs. ${Number(value ?? 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const normalizeServicePrice = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTodayStamp = () => new Date().toLocaleDateString('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

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
  // Paquetes agregados al ticket; el plan se crea al registrar el pago. Clave = nombre de la línea.
  const [combosVenta, setCombosVenta] = useState<Record<string, { combo_id: number; precio: number }>>({});
  const [catalogoTab, setCatalogoTab] = useState<'servicios' | 'paquetes' | 'personalizado'>('servicios');
  const [serviceQuery, setServiceQuery] = useState('');

  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [pagosError, setPagosError] = useState<string | null>(null);
	const pagosPagination = useCursorPagination(String(selectedLocal?.id ?? ''));
	const { cursor: pagosCursor, includeTotal: includePagosTotal, setMetadata: setPagosMetadata } = pagosPagination;
	const pagosRequestRef = useRef(0);

  const [clienteNit, setClienteNit] = useState('');
  const [nitPropuesto, setNitPropuesto] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [clientesSugeridos, setClientesSugeridos] = useState<ClienteOption[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);
  const [descuento, setDescuento] = useState(0);
  const [tipoPago, setTipoPago] = useState<'qr' | 'efectivo'>('qr');
  const [detalle, setDetalle] = useState<DetalleServicio[]>([]);
  const [customServicio, setCustomServicio] = useState('');
  const [customPrecio, setCustomPrecio] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [newClientModalOpen, setNewClientModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState<NewClientForm>({
    nombre: '',
    apellido: '',
    numero_telefono: '',
  });
  const [newClientErrors, setNewClientErrors] = useState<NewClientErrors>({});
  const [savingNewClient, setSavingNewClient] = useState(false);
  // Modo "cobrar reserva": en vez de armar un ticket libre, se elige un plan
  // RESERVADO existente y el pago lo activa (no crea un plan nuevo).
  const [modo, setModo] = useState<'venta' | 'cobrarReserva'>('venta');
  const [planesReservados, setPlanesReservados] = useState<PlanItem[]>([]);
  const [loadingPlanesReservados, setLoadingPlanesReservados] = useState(false);
  const [planReservado, setPlanReservado] = useState<PlanItem | null>(null);
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

  const fetchPagos = useCallback(async (local = selectedLocal) => {
    if (!local) return;
    setLoadingPagos(true);
    setPagosError(null);
	const requestId = ++pagosRequestRef.current;
    try {
      const res = await getPagosDB({
        local_nombre: local.nombre,
        estado: 'PAGADO',
        activo: true,
		limit: PAGE_LIMIT,
		cursor: pagosCursor,
		include_total: includePagosTotal,
      });
	  if (requestId !== pagosRequestRef.current) return;
      setPagos((res.data?.pagos ?? []) as PagoRow[]);
	  setPagosMetadata(res.data?.paginacion);
    } catch (err) {
	  if (requestId !== pagosRequestRef.current) return;
      setPagosError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setLoadingPagos(false);
    }
  }, [selectedLocal, pagosCursor, includePagosTotal, setPagosMetadata]);

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
    void fetchPagos(selectedLocal);
  }, [selectedLocal, fetchServicios, fetchCombos, fetchPagos]);

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
  const totalLocal = useMemo(
    () => pagos.reduce((sum, pago) => sum + Number(pago.total_final ?? 0), 0),
    [pagos],
  );

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

  const clearFieldError = (field: keyof FormErrors) => {
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const addDetalle = (servicio: ServicioOption) => {
    const precio = normalizeServicePrice(servicio.costo);
    setDetalle((prev) => {
      const existing = prev.findIndex((item) => item.servicio_id === servicio.id);
      if (existing >= 0) {
        return prev.map((item, index) => {
          if (index !== existing) return item;
          const cantidad = item.cantidad + 1;
          return { ...item, cantidad, subtotal: cantidad * item.precio_unitario };
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

  const addCustomDetalle = () => {
    const nombre = customServicio.trim();
    const precio = normalizeServicePrice(customPrecio);
    if (!nombre || precio <= 0) {
      setFormErrors((prev) => ({ ...prev, detalle: 'Agrega un nombre y precio válido para el servicio personalizado' }));
      return;
    }
    setDetalle((prev) => [
      ...prev,
      {
        servicio_id: null,
        servicio: nombre,
        precio_unitario: precio,
        cantidad: 1,
        subtotal: precio,
      },
    ]);
    setCustomServicio('');
    setCustomPrecio('');
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
    toast.success(`Paquete "${combo.nombre}" agregado al ticket`);
  };

  const updateCantidad = (index: number, cantidad: number) => {
    const safeCantidad = Math.max(1, cantidad);
    setDetalle((prev) => prev.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, cantidad: safeCantidad, subtotal: safeCantidad * item.precio_unitario }
        : item
    )));
  };

  const removeDetalle = (index: number) => {
    setDetalle((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const resetSale = () => {
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
    setCustomServicio('');
    setCustomPrecio('');
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
    setNewClientForm({ nombre: '', apellido: '', numero_telefono: '' });
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
    });
    setNewClientErrors({});
    setNewClientModalOpen(true);
  };

  const validate = () => {
    const errors: FormErrors = {};
    if (!selectedLocal) errors.local = 'Selecciona un local para abrir caja';
    if (!clienteNombre.trim()) errors.cliente_nombre = 'El nombre del cliente es obligatorio';
    if (detalle.length === 0) {
      errors.detalle = modo === 'cobrarReserva'
        ? 'Selecciona un paquete reservado para cobrar'
        : 'Agrega al menos un servicio';
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
    }
    setNewClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const registerPayment = async (clienteId: number | null) => {
    if (!selectedLocal) return;
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
        detalle,
      };
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
        // Crear el paquete (ya ACTIVO) de cada línea de paquete que quedó en el ticket.
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

      toast.success(modo === 'cobrarReserva' ? 'Paquete cobrado y activado' : 'Pago registrado en caja');
      resetSale();
      await fetchPagos(selectedLocal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrar pago';
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
        // El NIT tecleado en el ticket pasa a ser el NIT por defecto del
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

  const columns: Column<PagoRow>[] = [
    { key: 'codigo_pago', label: 'Código', searchable: false },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'cliente_nit', label: 'NIT', searchable: false },
    {
      key: 'tipo_pago',
      label: 'Tipo',
      searchable: false,
      render: (value) => String(value || 'No definido').toUpperCase(),
    },
    {
      key: 'total_final',
      label: 'Total',
      searchable: false,
      render: (value) => formatMoney(Number(value ?? 0)),
    },
    {
      key: 'fecha_creacion',
      label: 'Fecha y hora',
      searchable: false,
      render: (value) => formatDateTime(value as string),
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (value) => (
        <span className={value === 'PAGADO' ? 'admin-status-active' : 'admin-status-pending'}>
          {String(value)}
        </span>
      ),
    },
  ];

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <div className="admin-mesh" />
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <PageHeader
            kicker="Operación diaria"
            kickerIcon={<Banknote size={14} strokeWidth={2} />}
            title="Cobros"
            accentWord="Cobros"
            subtitle={selectedLocal ? `Registrando pagos en ${selectedLocal.nombre}` : 'Selecciona el local para iniciar el registro de pagos'}
          />

          <div ref={contentRef} className={styles.contentStack}>
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
                  <div className={styles.summaryItem}>
                    <span>Pagos del local</span>
                    <strong>{pagos.length}</strong>
                  </div>
                  <div className={styles.summaryItem}>
                    <span>Total listado</span>
                    <strong>{formatMoney(totalLocal)}</strong>
                  </div>
                </section>

                <div className={styles.paymentToggle} role="group" aria-label="Modo de cobro">
                  <button
                    type="button"
                    className={modo === 'venta' ? styles.paymentActive : ''}
                    onClick={() => handleModoChange('venta')}
                  >
                    <ReceiptText size={16} strokeWidth={1.8} />
                    Venta nueva
                  </button>
                  <button
                    type="button"
                    className={modo === 'cobrarReserva' ? styles.paymentActive : ''}
                    onClick={() => handleModoChange('cobrarReserva')}
                  >
                    <CheckCircle2 size={16} strokeWidth={1.8} />
                    Cobrar paquete reservado
                  </button>
                </div>

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
                            Escribe el nombre del cliente en el panel derecho y elige su paquete reservado para cargarlo al ticket.
                          </p>
                        )}
                      </div>
                    ) : (
                    <>
                    <div className={styles.catalogTabs} role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={catalogoTab === 'servicios'}
                        className={`${styles.catalogTab} ${catalogoTab === 'servicios' ? styles.catalogTabActive : ''}`}
                        onClick={() => setCatalogoTab('servicios')}
                      >
                        Servicios
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={catalogoTab === 'paquetes'}
                        className={`${styles.catalogTab} ${catalogoTab === 'paquetes' ? styles.catalogTabActive : ''}`}
                        onClick={() => setCatalogoTab('paquetes')}
                      >
                        Paquetes
                        {combos.length > 0 && <span className={styles.tabCount}>{combos.length}</span>}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={catalogoTab === 'personalizado'}
                        className={`${styles.catalogTab} ${catalogoTab === 'personalizado' ? styles.catalogTabActive : ''}`}
                        onClick={() => setCatalogoTab('personalizado')}
                      >
                        Otro
                      </button>
                    </div>

                    {catalogoTab !== 'personalizado' && (
                      <div className={styles.searchBox}>
                        <Search size={15} strokeWidth={1.8} />
                        <input
                          type="text"
                          value={serviceQuery}
                          onChange={(e) => setServiceQuery(e.target.value)}
                          placeholder={catalogoTab === 'servicios' ? 'Buscar servicio...' : 'Buscar paquete...'}
                        />
                      </div>
                    )}

                    <div className={styles.catalogBody}>
                      {catalogoTab === 'servicios' && (
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
                              <b>{formatMoney(normalizeServicePrice(servicio.costo))}</b>
                            </button>
                          ))}
                          {!loadingServicios && serviciosFiltrados.length === 0 && (
                            <p className={styles.mutedText}>No hay servicios para este filtro.</p>
                          )}
                        </div>
                      )}

                      {catalogoTab === 'paquetes' && (
                        <div className={styles.serviceList}>
                          {combosFiltrados.map((combo) => (
                            <button
                              key={combo.id}
                              type="button"
                              className={styles.serviceItem}
                              onClick={() => handleAgregarCombo(combo)}
                              title={`Agregar ${combo.nombre} al ticket`}
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

                      {catalogoTab === 'personalizado' && (
                        <div className={styles.customService}>
                          <input
                            type="text"
                            value={customServicio}
                            onChange={(e) => setCustomServicio(e.target.value)}
                            placeholder="Nombre del servicio"
                          />
                          <div className={styles.inlineFields}>
                            <input
                              type="number"
                              min={0}
                              value={customPrecio}
                              onChange={(e) => setCustomPrecio(e.target.value)}
                              placeholder="Precio"
                            />
                            <button type="button" className="admin-button admin-button-secondary" onClick={addCustomDetalle}>
                              <Plus size={16} strokeWidth={2} />
                              Agregar
                            </button>
                          </div>
                          <p className={styles.mutedText}>Cobro puntual que no está en el catálogo.</p>
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
                      </label>
                    </div>

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

                    <div className={styles.paymentToggle} role="group" aria-label="Tipo de pago">
                      <button
                        type="button"
                        className={tipoPago === 'qr' ? styles.paymentActive : ''}
                        onClick={() => setTipoPago('qr')}
                      >
                        <CreditCard size={16} strokeWidth={1.8} />
                        QR
                      </button>
                      <button
                        type="button"
                        className={tipoPago === 'efectivo' ? styles.paymentActive : ''}
                        onClick={() => setTipoPago('efectivo')}
                      >
                        <WalletCards size={16} strokeWidth={1.8} />
                        Efectivo
                      </button>
                    </div>

                    <div className={styles.ticketItems}>
                      {detalle.length === 0 ? (
                        <div className={styles.emptyTicket}>
                          <ReceiptText size={20} strokeWidth={1.7} />
                          <p>Agrega servicios desde el catálogo para armar el pago.</p>
                        </div>
                      ) : (
                        detalle.map((item, index) => (
                          <div key={`${item.servicio}-${index}`} className={styles.ticketItem}>
                            <div>
                              <strong>{item.servicio}</strong>
                              <span>{formatMoney(item.precio_unitario)} unitario</span>
                            </div>
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
                            <b>{formatMoney(item.subtotal)}</b>
                            <button type="button" className={styles.iconButton} onClick={() => removeDetalle(index)} aria-label="Quitar servicio">
                              <Trash2 size={15} strokeWidth={1.8} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    {formErrors.detalle && <small className={styles.fieldError}>{formErrors.detalle}</small>}

                    <div className={styles.totalsPanel}>
                      <div>
                        <span>Subtotal</span>
                        <strong>{formatMoney(subtotal)}</strong>
                      </div>
                      <label>
                        <span>Descuento</span>
                        <input
                          type="number"
                          min={0}
                          value={descuento}
                          onChange={(e) => setDescuento(Math.max(0, Number(e.target.value) || 0))}
                        />
                      </label>
                      <div className={styles.totalFinal}>
                        <span>Total a cobrar</span>
                        <strong>{formatMoney(totalFinal)}</strong>
                      </div>
                    </div>

                    {formErrors.submit && <div className={styles.submitError}>{formErrors.submit}</div>}

                    <div className={styles.ticketActions}>
                      <button type="button" className="admin-button admin-button-secondary" onClick={resetSale} disabled={saving}>
                        Limpiar
                      </button>
                      <button type="button" className="admin-button admin-button-primary" onClick={handleSubmit} disabled={saving}>
                        <CheckCircle2 size={17} strokeWidth={2} />
                        {saving ? 'Registrando...' : modo === 'cobrarReserva' ? 'Cobrar paquete' : 'Registrar pago'}
                      </button>
                    </div>
                  </div>
                </section>

                <section className={styles.historyPanel}>
                  <div className={`${styles.historyHeaderCard} ${styles.panelHeader}`}>
                    <div>
                      <span className={styles.kicker}>Historial local</span>
                      <h2>Pagos registrados en {selectedLocal.nombre}</h2>
                    </div>
                  </div>

                  <DataTable<PagoRow>
                    columns={columns}
                    data={pagos}
                    loading={loadingPagos}
                    error={pagosError}
                    onRefresh={() => fetchPagos(selectedLocal)}
                    getRowKey={(p) => p.codigo_pago}
                    searchPlaceholder="Buscar pagos del local..."
                    emptyMessage="Todavía no hay pagos en este local"
                  />
				  <CursorPagination page={pagosPagination.page} totalPages={pagosPagination.totalPages} hasNext={pagosPagination.hasNext} loading={loadingPagos} onPrevious={pagosPagination.previous} onNext={pagosPagination.next} />
                </section>
              </>
            )}
          </div>
        </div>
      </main>

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
            <input
              type="tel"
              value={newClientForm.numero_telefono}
              onChange={(e) => {
                setNewClientForm((prev) => ({ ...prev, numero_telefono: e.target.value }));
                if (newClientErrors.numero_telefono) {
                  setNewClientErrors((prev) => ({ ...prev, numero_telefono: undefined }));
                }
              }}
              className={newClientErrors.numero_telefono ? styles.inputError : ''}
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
