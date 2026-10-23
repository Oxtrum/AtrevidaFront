'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { LayoutTemplate, Package2 } from 'lucide-react';
import { AdminPageShell, AdminPanel, AlertBanner, ChoiceChips, FormField, PageHeader } from '@/components/AdminConfig';
import { toast } from '@/components/Shared/Toast';
import { useConfiguracion } from '@/lib/hooks/useConfiguracion';
import styles from './page.module.css';

const ROLES = ['admin_sys'];

const OPCIONES = [
  { value: 'visible', label: 'Visible' },
  { value: 'oculto', label: 'Oculto' },
] as const;

type Estado = (typeof OPCIONES)[number]['value'];

export default function PaginaPrincipalPage() {
  const { config, update } = useConfiguracion();
  const [guardando, setGuardando] = useState(false);

  const seccionVisible = config['publico.mostrar_paquetes'];

  const cambiarSeccion = useCallback(async (estado: Estado) => {
    setGuardando(true);
    try {
      await update({ 'publico.mostrar_paquetes': estado === 'visible' });
      toast.success(estado === 'visible' ? 'La sección de paquetes vuelve a verse en la página principal' : 'Sección de paquetes oculta en la página principal');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el cambio');
    } finally {
      setGuardando(false);
    }
  }, [update]);

  return (
    <AdminPageShell roles={ROLES}>
      <PageHeader
        kicker="Configuración"
        kickerIcon={<LayoutTemplate size={14} strokeWidth={2} />}
        title="Página principal"
        accentWord="principal"
        subtitle="Qué secciones ve el público en la web. Ocultar no da de baja nada: todo sigue disponible en administración."
        backHref="/atrevida-gestion/configuracion"
      />

      <div className={styles.stack}>
        <AdminPanel card title="Sección de paquetes" description="Apaga la sección completa (y su enlace del menú) en la página principal." icon={<Package2 size={18} strokeWidth={1.75} />}>
          <div className={styles.row}>
            <FormField label="Mostrar la sección de paquetes" labelId="pp-seccion-lbl" hint="Los paquetes siguen disponibles en el catálogo, en reservas y en caja.">
              <fieldset className={styles.control} disabled={guardando}>
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
          <p className={styles.hint}>
            Para ocultar un paquete en particular usa el chip de visibilidad o el menú ⋯ en el{' '}
            <Link href="/atrevida-gestion/configuracion/paquetes">catálogo de paquetes</Link>.
          </p>
        </AdminPanel>
      </div>
    </AdminPageShell>
  );
}
