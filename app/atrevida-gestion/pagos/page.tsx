'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { CreditCard, LockKeyhole, Search } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, CursorPagination } from '@/components/AdminConfig';
import type { Column } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { getPagosDB } from '@/lib/api/pagos';
import type { Pago } from '@/lib/api/pagos';
import { canViewAdminPayments } from '@/lib/auth/adminSession';
import { formatDateTime } from '@/lib/utils/formatDateTime';
import styles from './page.module.css';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useCursorPagination } from '@/lib/hooks/useCursorPagination';

interface PagoRow extends Pago, Record<string, unknown> {}

const ESTADO_OPTIONS = ['PAGADO', 'PENDIENTE', 'BORRADOR'];
const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'POR CONFIRMAR',
};

const formatMoney = (value: unknown) => `Bs. ${Number(value ?? 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export default function PagosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [authorized, setAuthorized] = useState(false);
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [pagos, setPagos] = useState<PagoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchCliente, setSearchCliente] = useState('');
  const [searchClienteDebounced, setSearchClienteDebounced] = useState('');
  const [searchNit, setSearchNit] = useState('');
  const [searchNitDebounced, setSearchNitDebounced] = useState('');
  const [filterEstado, setFilterEstado] = useState('PAGADO');
	const filterKey = `${searchClienteDebounced}|${searchNitDebounced}|${filterEstado}`;
	const pagination = useCursorPagination(filterKey);
	const { cursor: paginationCursor, requestRevision, shouldIncludeTotal, setMetadata: setPaginationMetadata } = pagination;
	const requestRef = useRef(0);
	const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchClienteDebounced(searchCliente), 350);
    return () => clearTimeout(timer);
  }, [searchCliente]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchNitDebounced(searchNit), 350);
    return () => clearTimeout(timer);
  }, [searchNit]);

  const fetchData = useCallback(async () => {
    void requestRevision;
	requestControllerRef.current?.abort();
	const controller = new AbortController();
	requestControllerRef.current = controller;
	const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await getPagosDB({
        cliente_nombre: searchClienteDebounced || undefined,
        cliente_nit: searchNitDebounced || undefined,
        estado: filterEstado || undefined,
        activo: true,
		limit: PAGE_LIMIT,
		cursor: paginationCursor,
		include_total: shouldIncludeTotal(),
      }, controller.signal);
	  if (requestId !== requestRef.current) return;
      setPagos((res.data?.pagos ?? []) as PagoRow[]);
      setTotal(res.data?.total ?? 0);
	  setPaginationMetadata(res.data?.paginacion);
    } catch (err) {
	  if (controller.signal.aborted) return;
	  if (requestId !== requestRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
	  if (requestId === requestRef.current) setLoading(false);
    }
  }, [searchClienteDebounced, searchNitDebounced, filterEstado, paginationCursor, requestRevision, shouldIncludeTotal, setPaginationMetadata]);

	useEffect(() => () => {
		requestRef.current += 1;
		requestControllerRef.current?.abort();
	}, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/atrevida-gestion/login');
      return;
    }

    const allowed = canViewAdminPayments();
    setAuthorized(allowed);
    setCheckedAccess(true);
    if (allowed) void fetchData();
    else setLoading(false);
  }, [router, fetchData]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const totalBs = useMemo(
    () => pagos.reduce((sum, pago) => sum + Number(pago.total_final ?? 0), 0),
    [pagos],
  );

  const columns: Column<PagoRow>[] = [
    { key: 'codigo_pago', label: 'Código', searchable: false },
    { key: 'local_nombre', label: 'Local' },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'cliente_nit', label: 'NIT', searchable: false },
    {
      key: 'tipo_pago',
      label: 'Tipo',
      searchable: false,
      render: (val) => String(val || 'No definido').toUpperCase(),
    },
    {
      key: 'total_final',
      label: 'Total',
      searchable: false,
      render: formatMoney,
    },
    {
      key: 'fecha_creacion',
      label: 'Fecha y hora',
      searchable: false,
      render: (val) => formatDateTime(val as string),
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
      render: (val) => (
        <span className={val === 'PAGADO' ? 'admin-status-active' : 'admin-status-pending'}>
          {ESTADO_LABELS[String(val)] ?? String(val)}
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
            kicker="Auditoría"
            kickerIcon={<CreditCard size={14} strokeWidth={2} />}
            title="Historial de Pagos"
            accentWord="Pagos"
            subtitle="Consulta administrativa de pagos, locales y clientes"
          />

          <div ref={contentRef} className={styles.contentStack}>
            {checkedAccess && !authorized ? (
              <section className={styles.accessPanel}>
                <div className={styles.accessIcon}>
                  <LockKeyhole size={22} strokeWidth={1.8} />
                </div>
                <div>
                  <h2>Acceso reservado</h2>
                  <p>La consulta global de pagos está disponible solo para usuarios administradores.</p>
                </div>
              </section>
            ) : (
              <>
                <div className={styles.summaryGrid}>
                  <div className={styles.metricBlock}>
                    <span>Pagos encontrados</span>
                    <strong>{total}</strong>
                  </div>
                  <div className={styles.metricBlock}>
                    <span>Total visible</span>
                    <strong>{formatMoney(totalBs)}</strong>
                  </div>
                </div>

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

                  <div className={styles.statusFilter}>
                    <CustomSelect
                      id="pagos-estado"
                      value={filterEstado}
                      onChange={setFilterEstado}
                      options={ESTADO_OPTIONS.map((estado) => ({ value: estado, label: ESTADO_LABELS[estado] ?? estado }))}
                      placeholder="Todos los estados"
                    />
                  </div>
                </div>

                <DataTable<PagoRow>
                  columns={columns}
                  data={pagos}
                  loading={loading}
                  error={error}
                  onRefresh={fetchData}
                  getRowKey={(p) => p.codigo_pago}
                  hideSearch
                  emptyMessage="No se encontraron pagos"
                />
				<CursorPagination page={pagination.page} totalPages={pagination.totalPages} hasNext={pagination.hasNext} loading={loading} onPrevious={pagination.previous} onNext={pagination.next} />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
