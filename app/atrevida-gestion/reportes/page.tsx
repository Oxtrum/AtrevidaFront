import { redirect } from 'next/navigation';

// Reportes ahora vive en Finanzas (pestañas Resumen y Ventas). Se conserva la ruta para enlaces y marcadores viejos.
export default function ReportesPage() {
  redirect('/atrevida-gestion/finanzas?tab=ventas');
}
