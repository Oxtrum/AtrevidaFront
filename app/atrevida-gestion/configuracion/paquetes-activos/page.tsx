'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { CheckCircle, Package2, XCircle } from 'lucide-react';
import Header from '@/components/AdminHeader/Header';
import { PageHeader, DataTable, AdminPanel, Column, RowActionsMenu } from '@/components/AdminConfig';
import { CustomSelect } from '@/components/Custom/CustomSelectAdmin';
import { toast } from '@/components/Shared/Toast';
import { getLocalesDB } from '@/lib/api/servicios';
import { getPlanesDB, cambiarEstadoPlan, type PlanItem } from '@/lib/api/planes';
import { useAdminLocalScopeState } from '@/lib/auth/useAdminLocalScope';
import styles from './page.module.css';

interface LocalOpt { id: number; nombre: string; }

export default function PaquetesActivosPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const adminLocalScope = useAdminLocalScopeState();
  const scopedLocalName = adminLocalScope.workplace?.nombre_local ?? '';

  const [planes, setPlanes] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [locales, setLocales] = useState<LocalOpt[]>([]);
  const [filtroLocal, setFiltroLocal] = useState(scopedLocalName);

  const hasFilter = adminLocalScope.ready && !!filtroLocal;

  const localOptions = [
    ...(scopedLocalName ? [] : [{ value: '', label: 'Seleccionar local' }]),
    ...locales.map((l) => ({ value: l.nombre, label: l.nombre })),
  ];

  const fetchPlanes = useCallback(async () => {
    if (!hasFilter) return;
    setLoading(true);
    try {
      const res = await getPlanesDB({ local: filtroLocal }) as {
        data?: { planes?: PlanItem[] };
      };
      setPlanes(res?.data?.planes ?? []);
    } catch {
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  }, [hasFilter, filtroLocal]);

  const fetchLocales = useCallback(async () => {
    try {
      const res = await getLocalesDB() as { data?: { locales?: LocalOpt[] } };
      setLocales(res?.data?.locales ?? []);
    } catch { /* best-effort */ }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/atrevida-gestion/login'); return; }
    fetchLocales();
  }, [router, fetchLocales]);

  useEffect(() => {
    if (hasFilter) fetchPlanes();
    else setPlanes([]);
  }, [fetchPlanes, hasFilter]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(contentRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (scopedLocalName) setFiltroLocal(scopedLocalName);
  }, [scopedLocalName]);

  const handleCambiarEstado = async (plan: PlanItem, nuevoEstado: string) => {
    try {
      await cambiarEstadoPlan(plan.id, nuevoEstado);
      toast.success(`Plan ${nuevoEstado}`);
      fetchPlanes();
    } catch {
      toast.error('No se pudo cambiar el estado.');
    }
  };

  const columns: Column<PlanItem>[] = [
    { key: 'cliente', label: 'Cliente' },
    {
      key: 'combo_nombre_snapshot',
      label: 'Paquete',
      render: (_v, row) => <span>{row.combo_nombre_snapshot ?? '—'}</span>,
    },
    {
      key: 'sesiones',
      label: 'Sesiones',
      searchable: false,
      render: (_v, row) => <span>{row.sesiones_usadas}/{row.sesiones_totales}</span>,
    },
    {
      key: 'precio_total',
      label: 'Total',
      searchable: false,
      render: (_v, row) => <span>{row.precio_total} Bs</span>,
    },
    {
      key: 'estado',
      label: 'Estado',
      searchable: false,
    },
    {
      key: 'acciones',
      label: '',
      searchable: false,
      render: (_v, row) => {
        if (row.estado !== 'ACTIVO') return null;
        return (
          <RowActionsMenu actions={[
            { label: 'Completar', icon: <CheckCircle size={12} strokeWidth={2} />, onClick: () => handleCambiarEstado(row, 'COMPLETADO') },
            { label: 'Cancelar', icon: <XCircle size={12} strokeWidth={2} />, onClick: () => handleCambiarEstado(row, 'CANCELADO'), variant: 'danger' },
          ]} />
        );
      },
    },
  ];

  return (
    <AdminPanel ref={containerRef}>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <PageHeader
            kicker="Configuración"
            kickerIcon={<Package2 size={14} strokeWidth={2} />}
            title="Paquetes Activos"
            accentWord="Paquetes"
            subtitle="Planes de servicios adquiridos por clientes"
            backHref="/atrevida-gestion/configuracion"
          />

          <div ref={contentRef} className={styles.contentStack}>
            {!scopedLocalName && (
              <div className={styles.filterRow}>
                <div className={styles.filterGroup}>
                  <label id="lbl-local" htmlFor="filtro-local">Local</label>
                  <CustomSelect
                    id="filtro-local"
                    ariaLabelledBy="lbl-local"
                    value={filtroLocal}
                    onChange={setFiltroLocal}
                    options={localOptions}
                  />
                </div>
              </div>
            )}

            <DataTable<PlanItem>
              columns={columns}
              data={planes}
              loading={loading}
              getRowKey={(p) => p.id}
              emptyMessage="No hay paquetes activos para este local."
            />
          </div>
        </div>
      </main>
    </AdminPanel>
  );
}
