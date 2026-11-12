'use client';

import { BarChart3 } from 'lucide-react';
import { AdminPageShell, PageHeader } from '@/components/AdminConfig';
import { ReporteClientesPanel } from '@/components/AdminReportes';

// Igual que el resto de reportes con dinero: solo admin_sys (el endpoint también lo exige).
const ROLES = ['admin_sys'];

export default function ReporteClientesPage() {
  return (
    <AdminPageShell roles={ROLES}>
      <PageHeader
        kicker="Clientes"
        kickerIcon={<BarChart3 size={14} strokeWidth={2} />}
        title="Reportes de clientes"
        accentWord="clientes"
        subtitle="Quién generó más dinero, quién tuvo más citas, quién vuelve y quién debe; por semana, quincena o mes, en general y por local."
      />
      <ReporteClientesPanel />
    </AdminPageShell>
  );
}
