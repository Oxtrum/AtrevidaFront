'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Plus, Search, DollarSign } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, FormModal } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { getPagosDB, crearPagoDB } from '@/lib/api/pagos';
import type { Pago, DetalleServicio, CrearPagoData } from '@/lib/api/pagos';
import styles from './page.module.css';

interface PagoRow extends Pago, Record<string, unknown> {}

interface FormState {
  local_id: number;
  local_nombre: string;
  cliente_id: number | null;
  cliente_nit: string;
  cliente_nombre: string;
  descuento: number;
  estado: string;
  activo: boolean;
  detalle: DetalleServicio[];
}

interface FormErrors {
  local_id?: string;
  cliente_nit?: string;
  cliente_nombre?: string;
  detalle?: string;
  submit?: string;
}

const FORM_INITIAL: FormState = {
  local_id: 1,
  local_nombre: '',
  cliente_id: null,
  cliente_nit: '',
  cliente_nombre: '',
  descuento: 0,
  estado: 'PENDIENTE',
  activo: true,
  detalle: [],
};

const ESTADO_OPTIONS = ['PENDIENTE', 'PAGADO', 'CANCELADO', 'DEVUELTO'];

export default function PagosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchCliente, setSearchCliente] = useState('');
  const [searchClienteDebounced, setSearchClienteDebounced] = useState('');
  const [searchNit, setSearchNit] = useState('');
  const [searchNitDebounced, setSearchNitDebounced] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchClienteDebounced(searchCliente), 350);
    return () => clearTimeout(timer);
  }, [searchCliente]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchNitDebounced(searchNit), 350);
    return () => clearTimeout(timer);
  }, [searchNit]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPagosDB({
        cliente_nombre: searchClienteDebounced || undefined,
        cliente_nit: searchNitDebounced || undefined,
        estado: filterEstado || undefined,
        activo: true,
      });
      const data = (res as { data?: { pagos?: Pago[]; total?: number } }).data;
      setPagos((data?.pagos ?? []) as PagoRow[]);
      setTotal(data?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  }, [searchClienteDebounced, searchNitDebounced, filterEstado]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const patchForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const resetModal = () => {
    setForm(FORM_INITIAL);
    setFormErrors({});
  };

  const openCreate = () => {
    resetModal();
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: FormErrors = {};
    if (!form.local_id) errors.local_id = 'El local es obligatorio';
    if (!form.cliente_nit.trim()) errors.cliente_nit = 'El NIT del cliente es obligatorio';
    if (!form.cliente_nombre.trim()) errors.cliente_nombre = 'El nombre del cliente es obligatorio';
    if (form.detalle.length === 0) errors.detalle = 'Se requiere al menos un servicio';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddDetalle = () => {
    patchForm({
      detalle: [
        ...form.detalle,
        {
          servicio_id: null,
          servicio: '',
          precio_unitario: 0,
          cantidad: 1,
          subtotal: 0,
        },
      ],
    });
  };

  const handleRemoveDetalle = (index: number) => {
    patchForm({
      detalle: form.detalle.filter((_, i) => i !== index),
    });
  };

  const handleUpdateDetalle = (index: number, field: keyof DetalleServicio, value: unknown) => {
    const newDetalle = [...form.detalle];
    newDetalle[index] = { ...newDetalle[index], [field]: value };

    if (field === 'precio_unitario' || field === 'cantidad') {
      const cantidad = field === 'cantidad' ? (value as number) : newDetalle[index].cantidad;
      const precio = field === 'precio_unitario' ? (value as number) : newDetalle[index].precio_unitario;
      newDetalle[index].subtotal = cantidad * precio;
    }

    patchForm({ detalle: newDetalle });
  };

  const calcularSubtotal = (): number => {
    return form.detalle.reduce((sum, d) => sum + d.subtotal, 0);
  };

  const calcularTotal = (): number => {
    const subtotal = calcularSubtotal();
    return Math.max(0, subtotal - form.descuento);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setFormErrors({});
    try {
      const payloadData: CrearPagoData = {
        local_id: form.local_id,
        local_nombre: form.local_nombre || 'SAN MARTIN',
        cliente_id: form.cliente_id,
        cliente_nit: form.cliente_nit.trim(),
        cliente_nombre: form.cliente_nombre.trim(),
        descuento: form.descuento,
        estado: form.estado,
        activo: form.activo,
        detalle: form.detalle,
      };

      await crearPagoDB(payloadData);
      toast.success('Pago creado correctamente');
      setModalOpen(false);
      resetModal();
      await fetchData();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al crear pago';
      setFormErrors({ submit: errorMsg });
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<PagoRow>[] = [
    { key: 'codigo_pago', label: 'Código', searchable: false },
    { key: 'local_nombre', label: 'Local' },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'cliente_nit', label: 'NIT', searchable: false },
    {
      key: 'total_final',
      label: 'Total',
      searchable: false,
      render: (val) => `Bs. ${Number(val).toLocaleString('es-BO')}`,
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (val) => (
        <span style={{
          padding: '0.25rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: val === 'PAGADO' ? 'rgba(34, 197, 94, 0.1)' : val === 'PENDIENTE' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(107, 114, 128, 0.1)',
          color: val === 'PAGADO' ? '#22c55e' : val === 'PENDIENTE' ? '#f97316' : '#6b7280',
        }}>
          {String(val)}
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
            kicker="Transacciones"
            kickerIcon={<DollarSign size={14} strokeWidth={2} />}
            title="Pagos"
            accentWord="Pagos"
            subtitle="Gestiona los pagos de servicios"
            actions={
              <button className="admin-button admin-button-primary" onClick={openCreate}>
                <Plus size={16} strokeWidth={2.2} />
                Nuevo Pago
              </button>
            }
          />

          <div ref={contentRef} className={styles.contentStack}>
            {/* Filtros */}
            <div className={styles.searchRow}>
              <div className={styles.searchBar}>
                <Search size={16} strokeWidth={1.8} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar por cliente..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                />
              </div>

              <div className={styles.searchBar}>
                <Search size={16} strokeWidth={1.8} className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar por NIT..."
                  value={searchNit}
                  onChange={(e) => setSearchNit(e.target.value)}
                />
              </div>

              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className={styles.filterField}
                style={{ flex: '0 1 auto', minWidth: '150px' }}
              >
                <option value="">Todos los estados</option>
                {ESTADO_OPTIONS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>

              <span className={styles.totalLabel}>
                Total: <strong>{total}</strong>
              </span>
            </div>

            {/* Tabla de pagos */}
            <DataTable<PagoRow>
              columns={columns}
              data={pagos}
              loading={loading}
              error={error}
              onRefresh={fetchData}
              getRowKey={(p) => p.codigo_pago}
              searchPlaceholder="Buscar pagos..."
              emptyMessage="No se encontraron pagos"
            />
          </div>
        </div>
      </main>

      {/* Modal crear pago */}
      <FormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetModal();
        }}
        title="Nuevo Pago"
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel="Crear Pago"
      >
        <div className={styles.formGrid}>
          {/* Cliente NIT */}
          <div className={styles.field}>
            <label htmlFor="pago-nit">NIT Cliente</label>
            <input
              id="pago-nit"
              type="text"
              value={form.cliente_nit}
              onChange={(e) => {
                patchForm({ cliente_nit: e.target.value });
                if (formErrors.cliente_nit) setFormErrors((p) => ({ ...p, cliente_nit: undefined }));
              }}
              placeholder="Ej: 1234567"
              autoFocus
              aria-invalid={!!formErrors.cliente_nit}
              className={formErrors.cliente_nit ? styles.inputError : ''}
            />
            {formErrors.cliente_nit && <span className={styles.fieldError}>{formErrors.cliente_nit}</span>}
          </div>

          {/* Cliente Nombre */}
          <div className={styles.field}>
            <label htmlFor="pago-nombre">Nombre Cliente</label>
            <input
              id="pago-nombre"
              type="text"
              value={form.cliente_nombre}
              onChange={(e) => {
                patchForm({ cliente_nombre: e.target.value });
                if (formErrors.cliente_nombre) setFormErrors((p) => ({ ...p, cliente_nombre: undefined }));
              }}
              placeholder="Ej: María López"
              aria-invalid={!!formErrors.cliente_nombre}
              className={formErrors.cliente_nombre ? styles.inputError : ''}
            />
            {formErrors.cliente_nombre && <span className={styles.fieldError}>{formErrors.cliente_nombre}</span>}
          </div>

          {/* Descuento */}
          <div className={styles.field}>
            <label htmlFor="pago-descuento">Descuento</label>
            <input
              id="pago-descuento"
              type="number"
              value={form.descuento}
              onChange={(e) => patchForm({ descuento: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              min="0"
            />
          </div>

          {/* Estado */}
          <div className={styles.field}>
            <label htmlFor="pago-estado">Estado</label>
            <select
              id="pago-estado"
              value={form.estado}
              onChange={(e) => patchForm({ estado: e.target.value })}
            >
              {ESTADO_OPTIONS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          {/* Detalles de servicios */}
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <div className={styles.detallesSection}>
              <div className={styles.detallesHeader}>
                <h3>Servicios</h3>
              </div>

              {form.detalle.length > 0 ? (
                <table className={styles.detallesTable}>
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th>Precio Unit.</th>
                      <th>Cantidad</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.detalle.map((detalle, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            value={detalle.servicio}
                            onChange={(e) => handleUpdateDetalle(idx, 'servicio', e.target.value)}
                            placeholder="Ej: Limpieza facial"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={detalle.precio_unitario}
                            onChange={(e) => handleUpdateDetalle(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={detalle.cantidad}
                            onChange={(e) => handleUpdateDetalle(idx, 'cantidad', parseFloat(e.target.value) || 1)}
                            placeholder="1"
                            min="1"
                          />
                        </td>
                        <td>${detalle.subtotal.toFixed(2)}</td>
                        <td>
                          <div className={styles.detallesActions}>
                            <button
                              type="button"
                              onClick={() => handleRemoveDetalle(idx)}
                              title="Eliminar"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--admin-text-dim)', fontSize: '0.875rem' }}>
                  No hay servicios agregados
                </p>
              )}

              <button
                type="button"
                className={styles.addDetalleButton}
                onClick={handleAddDetalle}
              >
                <Plus size={14} strokeWidth={2} />
                Agregar Servicio
              </button>

              {formErrors.detalle && <span className={styles.fieldError}>{formErrors.detalle}</span>}
            </div>
          </div>

          {/* Resumen */}
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <div className={styles.resumenSection}>
              <div className={styles.resumenRow}>
                <span className={styles.resumenLabel}>Subtotal:</span>
                <span className={styles.resumenValue}>${calcularSubtotal().toFixed(2)}</span>
              </div>
              <div className={styles.resumenRow}>
                <span className={styles.resumenLabel}>Descuento:</span>
                <span className={styles.resumenValue}>${form.descuento.toFixed(2)}</span>
              </div>
              <div className={`${styles.resumenRow} ${styles.totalFinal}`}>
                <span className={styles.resumenLabel}>Total Final:</span>
                <span className={styles.resumenValue}>${calcularTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {formErrors.submit && <div className={styles.submitError}>{formErrors.submit}</div>}
      </FormModal>
    </div>
  );
}
