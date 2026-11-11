'use client';

import { useState } from 'react';
import { CalendarDays, ClipboardCheck, ListChecks, PackageOpen, Users } from 'lucide-react';
import { AdminPageShell, PageHeader, Tabs } from '@/components/AdminConfig';
import { HistorialAtencionesTab } from '@/components/AdminAtenciones/HistorialAtencionesTab';
import { JornadaTab } from '@/components/AdminAtenciones/JornadaTab';
import { CalendarioPersonalTab } from '@/components/AdminAtenciones/CalendarioPersonalTab';
import { CalendarioConsumoTab } from '@/components/AdminAtenciones/CalendarioConsumoTab';
import { SeguimientoTab } from '@/components/AdminAtenciones/SeguimientoTab';

type TabKey = 'jornada' | 'personal' | 'consumo' | 'seguimiento' | 'historial';

function readVista(): TabKey {
  if (typeof window === 'undefined') return 'jornada';
  const vista = new URLSearchParams(window.location.search).get('vista');
  if (vista === 'historial') return 'historial';
  if (vista === 'personal') return 'personal';
  if (vista === 'consumo') return 'consumo';
  if (vista === 'seguimiento') return 'seguimiento';
  return 'jornada';
}

export default function AtencionesPage() {
  const [tab, setTab] = useState<TabKey>(readVista);

  const cambiarTab = (next: TabKey) => {
    setTab(next);
    // Cada pestaña conserva solo sus propios filtros. Evita compartir una URL
    // con parámetros de otra consulta (por ejemplo, una semana de consumo en
    // el Historial) y hace que el enlace sea legible y reproducible.
    const params = new URLSearchParams({ vista: next });
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  return (
    <AdminPageShell>
      <PageHeader
        kicker="Operación diaria"
        kickerIcon={<ClipboardCheck size={14} />}
        title="Atenciones"
        accentWord="Atenciones"
        subtitle="Registro de clientes atendidos, insumos usados y personal que atendió."
      />
      <Tabs
        tabs={[
          { key: 'jornada', label: 'Jornada', icon: <CalendarDays size={14} /> },
          { key: 'personal', label: 'Personal', icon: <Users size={14} /> },
          { key: 'consumo', label: 'Insumos', icon: <PackageOpen size={14} /> },
          { key: 'seguimiento', label: 'Seguimiento', icon: <ListChecks size={14} /> },
          { key: 'historial', label: 'Historial', icon: <ClipboardCheck size={14} /> },
        ]}
        active={tab}
        onChange={cambiarTab}
        ariaLabel="Secciones de atenciones"
      />
      {tab === 'jornada' && <JornadaTab />}
      {tab === 'personal' && <CalendarioPersonalTab />}
      {tab === 'consumo' && <CalendarioConsumoTab />}
      {tab === 'seguimiento' && <SeguimientoTab />}
      {tab === 'historial' && <HistorialAtencionesTab />}
    </AdminPageShell>
  );
}
