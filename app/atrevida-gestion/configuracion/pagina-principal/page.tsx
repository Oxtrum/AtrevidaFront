'use client';

import { useCallback, useEffect, useState } from 'react';
import { EyeOff, LayoutTemplate, Package2 } from 'lucide-react';
import { AdminPageShell, AdminPanel, AlertBanner, ChoiceChips, FormField, PageHeader, StatusBadge } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { cambiarVisibilidadPaquete, getPaquetesDB, type PaqueteDetalle } from '@/lib/api/paquetes';
import { PAGE_LIMIT } from '@/lib/api/pagination';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import { resumenVisibilidad } from '@/lib/utils/visibilidadPublica';
import styles from './page.module.css';

const ROLES = ['admin_sys'];

const OPCIONES = [
  { value: 'visible', label: 'Visible' },
  { value: 'oculto', label: 'Oculto' },
] as const;

type Estado = (typeof OPCIONES)[number]['value'];

/** Trae todo el catálogo activo (es corto): la pantalla necesita ver también los ocultos. */
async function cargarCatalogo(): Promise<PaqueteDetalle[]> {
  const todos: PaqueteDetalle[] = [];
  let cursor: string | undefined;
  do {
    const res = await getPaquetesDB({ activo: true, limit: PAGE_LIMIT, cursor });
    todos.push(...(res.data?.paquetes ?? []));
    cursor = res.data?.paginacion?.next_cursor || undefined;
  } while (cursor);
  return todos;
}

export default function PaginaPrincipalPage() {
  const { config, update } = useConfiguracion();
  const [paquetes, setPaquetes] = useState<PaqueteDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendiente, setPendiente] = useState<number | 'seccion' | null>(null);

  const seccionVisible = config['publico.mostrar_paquetes'];

  useEffect(() => {
    let activo = true;
    cargarCatalogo()
      .then((lista) => { if (activo) setPaquetes(lista); })
      .catch((e) => { if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los paquetes'); })
      .finally(() => { if (activo) setLoading(false); });
    return () => { activo = false; };
  }, []);

  const cambiarSeccion = useCallback(async (estado: Estado) => {
    setPendiente('seccion');
    try {
      await update({ 'publico.mostrar_paquetes': estado === 'visible' });
      toast.success(estado === 'visible' ? 'La sección de paquetes vuelve a verse en la página principal' : 'Sección de paquetes oculta en la página principal');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el cambio');
    } finally {
      setPendiente(null);
    }
  }, [update]);

  const cambiarPaquete = useCallback(async (p: PaqueteDetalle, estado: Estado) => {
    const visible = estado === 'visible';
    setPendiente(p.paquete.id);
    try {
      await cambiarVisibilidadPaquete(p.paquete.id, visible);
      setPaquetes((lista) => lista.map((x) => (
        x.paquete.id === p.paquete.id ? { ...x, paquete: { ...x.paquete, visible_publico: visible } } : x
      )));
      toast.success(visible ? `«${p.paquete.nombre}» visible en la página principal` : `«${p.paquete.nombre}» oculto de la página principal`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el cambio');
    } finally {
      setPendiente(null);
    }
  }, []);

  const { visibles, ocultos } = resumenVisibilidad(paquetes);

  return (
    <AdminPageShell roles={ROLES}>
      <PageHeader
        kicker="Configuración"
        kickerIcon={<LayoutTemplate size={14} strokeWidth={2} />}
        title="Página principal"
        accentWord="principal"
        subtitle="Decide qué paquetes ve el público. Ocultarlos no los da de baja: siguen disponibles en administración."
        backHref="/atrevida-gestion/configuracion"
      />

      <div className={styles.stack}>
        <AdminPanel card title="Sección de paquetes" description="Apaga la sección completa (y su enlace del menú) en la página principal." icon={<Package2 size={18} strokeWidth={1.75} />}>
          <div className={styles.row}>
            <FormField label="Mostrar la sección de paquetes" labelId="pp-seccion-lbl" hint="Los paquetes siguen disponibles en el catálogo, en reservas y en caja.">
              <fieldset className={styles.control} disabled={pendiente === 'seccion'}>
                <ChoiceChips
                  variant="toggle"
                  ariaLabel="Mostrar la sección de paquetes"
                  options={[...OPCIONES]}
                  value={seccionVisible ? 'visible' : 'oculto'}
                  onChange={cambiarSeccion}
                />
              </fieldset>
            </FormField>
          </div>
          {!seccionVisible && (
            <AlertBanner tone="warning">La sección está oculta: el público no ve ningún paquete, sin importar la visibilidad de cada uno.</AlertBanner>
          )}
        </AdminPanel>

        <AdminPanel
          card
          tone="info"
          title="Visibilidad por paquete"
          description={loading ? 'Cargando catálogo…' : `${visibles} visibles · ${ocultos} ocultos`}
          icon={<EyeOff size={18} strokeWidth={1.75} />}
        >
          {error && <AlertBanner tone="danger">{error}</AlertBanner>}
          {!loading && !error && paquetes.length === 0 && <p className={styles.empty}>Aún no hay paquetes en el catálogo.</p>}
          <ul className={styles.list}>
            {paquetes.map((p) => {
              const visible = p.paquete.visible_publico !== false;
              return (
                <li key={p.paquete.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{p.paquete.nombre}</span>
                    <span className={styles.itemMeta}>
                      {p.paquete.categoria && <span>{p.paquete.categoria}</span>}
                      {p.locales.length > 0 && <span>{p.locales.map((l) => l.nombre).join(' · ')}</span>}
                      {!visible && <StatusBadge tone="warning">Oculto al público</StatusBadge>}
                    </span>
                  </div>
                  <fieldset className={styles.control} disabled={pendiente === p.paquete.id}>
                    <ChoiceChips
                      variant="toggle"
                      ariaLabel={`Visibilidad de ${p.paquete.nombre}`}
                      options={[...OPCIONES]}
                      value={visible ? 'visible' : 'oculto'}
                      onChange={(estado) => cambiarPaquete(p, estado)}
                    />
                  </fieldset>
                </li>
              );
            })}
          </ul>
        </AdminPanel>
      </div>
    </AdminPageShell>
  );
}
