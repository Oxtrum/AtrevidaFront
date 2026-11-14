'use client';

import { BarChart3 } from 'lucide-react';
import { AdminPageShell, PageHeader } from '@/components/AdminConfig';
import { ReportePersonalPanel } from '@/components/AdminRRHH';

// Igual que el resto de Recursos Humanos: solo admin_sys.
const ROLES = ['admin_sys'];

export default function ReportesRRHHPage() {
  return (
    <AdminPageShell roles={ROLES}>
      <PageHeader
        kicker="Recursos Humanos"
        kickerIcon={<BarChart3 size={14} strokeWidth={2} />}
        title="Reportes de Recursos Humanos"
        accentWord="Recursos Humanos"
        subtitle="Quién atendió más, por semana, quincena o mes, en general y por local. Sale de las atenciones registradas."
      />
      <ReportePersonalPanel />
    </AdminPageShell>
  );
}
