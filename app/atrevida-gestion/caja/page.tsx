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
import { PageHeader, DataTable, FormModal } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { crearClienteDB, getClientesDB } from '@/lib/api/clientes';
import type { ClientePG } from '@/lib/api/clientes';
import { crearPagoDB, getPagosDB } from '@/lib/api/pagos';
import type { CrearPagoData, DetalleServicio, Pago } from '@/lib/api/pagos';
import { getLocalesDB, getServiciosDB } from '@/lib/api/servicios';
import styles from './page.module.css';

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
  const [serviceQuery, setServiceQuery] = useState('');

  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [pagosError, setPagosError] = useState<string | null>(null);

  const [clienteNit, setClienteNit] = useState('');
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

  const fetchLocales = useCallback(async () => {
    setLoadingLocales(true);
    setLocalesError(null);
    try {
      const res = await getLocalesDB();
      const activeLocales = (res?.data?.locales ?? []).filter((local) => local.activo !== false);
      setLocales(activeLocales);

      const restored = restoreStoredLocal(activeLocales);
      if (restored) setSelectedLocal(restored);
    } catch (err) {
      setLocalesError(err instanceof Error ? err.message : 'Error al cargar locales');
    } finally {
      setLoadingLocales(false);
    }
  }, []);

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

  const fetchPagos = useCallback(async (local = selectedLocal) => {
    if (!local) return;
    setLoadingPagos(true);
    setPagosError(null);
    try {
      const res = await getPagosDB({
        local_nombre: local.nombre,
        estado: 'PAGADO',
        activo: true,
      });
      setPagos((res.data?.pagos ?? []) as PagoRow[]);
    } catch (err) {
      setPagosError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setLoadingPagos(false);
    }
  }, [selectedLocal]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
      return;
    }
    void fetchLocales();
  }, [router, fetchLocales]);

  useEffect(() => {
    if (!selectedLocal) return;
    void fetchServicios(selectedLocal);
    void fetchPagos(selectedLocal);
  }, [selectedLocal, fetchServicios, fetchPagos]);

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
        const res = await getClientesDB({ nombre: query });
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
    setClienteNombre('');
    setSelectedClienteId(null);
    setClientesSugeridos([]);
    setClienteDropdownOpen(false);
    setDescuento(0);
    setTipoPago('qr');
    setDetalle([]);
    setCustomServicio('');
    setCustomPrecio('');
    setFormErrors({});
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
    setClienteDropdownOpen(false);
    setClientesSugeridos([]);
    clearFieldError('cliente_nombre');
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
    if (detalle.length === 0) errors.detalle = 'Agrega al menos un servicio';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateNewClient = () => {
    const errors: NewClientErrors = {};
    if (!newClientForm.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!newClientForm.apellido.trim()) errors.apellido = 'Los apellidos son obligatorios';
    if (!newClientForm.numero_telefono.trim()) errors.numero_telefono = 'El celular es obligatorio';
    setNewClientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const registerPayment = async (clienteId: number | null) => {
    if (!selectedLocal) return;
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
      await crearPagoDB(payload);
      toast.success('Pago registrado en caja');
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
            title="Caja"
            accentWord="Caja"
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
                    <button type="button" onClick={() => setSelectedLocal(null)}>Cambiar</button>
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

                <section className={styles.saleShell}>
                  <div className={styles.catalogPanel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <span className={styles.kicker}>Catálogo</span>
                        <h2>Servicios</h2>
                      </div>
                      {loadingServicios && <span className="admin-badge">Cargando</span>}
                    </div>

                    <div className={styles.searchBox}>
                      <Search size={15} strokeWidth={1.8} />
                      <input
                        type="text"
                        value={serviceQuery}
                        onChange={(e) => setServiceQuery(e.target.value)}
                        placeholder="Buscar servicio..."
                      />
                    </div>

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

                    <div className={styles.customService}>
                      <span className={styles.kicker}>Servicio personalizado</span>
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
                    </div>
                  </div>

                  <div className={styles.ticketPanel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <span className={styles.kicker}>Nuevo pago</span>
                        <h2>Detalle de caja</h2>
                      </div>
                      <ReceiptText size={22} strokeWidth={1.7} />
                    </div>

                    <div className={styles.clientGrid}>
                      <label>
                        <span>NIT cliente (opcional)</span>
                        <input
                          type="text"
                          value={clienteNit}
                          onChange={(e) => {
                            setClienteNit(e.target.value);
                            clearFieldError('cliente_nit');
                          }}
                          className={formErrors.cliente_nit ? styles.inputError : ''}
                          placeholder="NIT o CI si corresponde"
                        />
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
                        {saving ? 'Registrando...' : 'Registrar pago'}
                      </button>
                    </div>
                  </div>
                </section>

                <section className={styles.historyPanel}>
                  <div className={styles.panelHeader}>
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
