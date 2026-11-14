'use client';

import { BarChart3 } from 'lucide-react';
import { AdminPageShell, PageHeader } from '@/components/AdminConfig';
import { ReportePersonalPanel } from '@/components/AdminRRHH';

// Productividad del personal, sin sueldos ni dinero: admin_sys y coordinacion.
// El resto de Recursos Humanos (empleados y planillas) sigue siendo solo de admin_sys.
const ROLES = ['admin_sys', 'coordinacion'];

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
