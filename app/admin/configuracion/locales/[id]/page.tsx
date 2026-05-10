'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import gsap from 'gsap';
import Header from '@/components/AdminHeader/Header';
import { PageHeader } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { getLocalByID, actualizarLocal } from '@/lib/api/servicios';
import styles from './page.module.css';

interface Espacio {
  tipo_espacio: string;
  cantidad_espacios: number;
}

export default function EditarLocalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [nombre, setNombre] = useState('');
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLocal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLocalByID(params.id) as { data?: { local?: { nombre: string; espacios: Espacio[] } } };
      const local = res?.data?.local;
      if (local) {
        setNombre(local.nombre ?? '');
        setEspacios(normalizeEspacios(local.espacios ?? []));
      }
    } catch {
      toast.error('Error al cargar el local');
      router.push('/admin/configuracion/locales');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchLocal();
  }, [router, fetchLocal]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(formRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    }, containerRef);
    return () => ctx.kill();
  }, []);

  const handleSave = async () => {
    if (!nombre.trim()) return;
    const espaciosValidos = espacios.filter((e) => e.cantidad_espacios > 0);
    setSaving(true);
    try {
      await actualizarLocal(params.id, { nombre: nombre.trim(), espacios: espaciosValidos });
      toast.success('Local actualizado correctamente');
      router.push('/admin/configuracion/locales');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar local');
    } finally {
      setSaving(false);
    }
  };

  const updateCantidad = (i: number, value: number) => {
    setEspacios((prev) => prev.map((e, idx) => (idx === i ? { ...e, cantidad_espacios: value } : e)));
  };

  const normalizeEspacios = (items: Espacio[]) => {
    const hasM = items.some((e) => e.tipo_espacio === 'M');
    const hasB = items.some((e) => e.tipo_espacio === 'B');
    const result: Espacio[] = [];
    if (hasM) result.push(items.find((e) => e.tipo_espacio === 'M')!);
    else result.push({ tipo_espacio: 'M', cantidad_espacios: 0 });
    if (hasB) result.push(items.find((e) => e.tipo_espacio === 'B')!);
    else result.push({ tipo_espacio: 'B', cantidad_espacios: 0 });
    return result;
  };

  if (loading) {
    return (
      <div ref={containerRef} className={styles.pageContainer}>
        <Header />
        <main className={styles.main}>
          <p style={{ textAlign: 'center', color: 'var(--admin-text-dim)', padding: '3rem 0' }}>Cargando...</p>
        </main>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <PageHeader title="Editar Local" subtitle={nombre} backHref="/admin/configuracion/locales" />
        <div ref={formRef} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="edit-nombre">Nombre del local</label>
            <input
              id="edit-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--admin-foreground)', display: 'block', marginBottom: '0.75rem' }}>
            Espacios
          </label>
          {espacios.map((esp, i) => (
            <div key={esp.tipo_espacio} className={styles.espacioRow}>
              <div className={styles.tipoLabel}>
                {esp.tipo_espacio === 'M' ? 'Mesas' : 'Bicicletas'}
              </div>
              <div className={styles.field}>
                <label>Cantidad</label>
                <input
                  type="number"
                  min={0}
                  value={esp.cantidad_espacios}
                  onChange={(e) => updateCantidad(i, Number(e.target.value))}
                />
              </div>
            </div>
          ))}

          <div className={styles.actions}>
            <button className="admin-button admin-button-secondary" onClick={() => router.push('/admin/configuracion/locales')}>
              Cancelar
            </button>
            <button className="admin-button admin-button-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
