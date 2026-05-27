import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo';
import ReservasLanding from '../ReservasLanding';

export const metadata: Metadata = {
  title: 'Crear reserva de tratamiento estetico',
  description:
    'Completa el formulario para solicitar tu cita en AtrevidaFit. Puedes reservar evaluacion gratuita, tratamientos corporales o tratamientos faciales.',
  alternates: {
    canonical: '/reservas/crear',
  },
  openGraph: {
    title: 'Crear reserva de tratamiento estetico | AtrevidaFit',
    description:
      'Solicita tu cita en AtrevidaFit Cochabamba y recibe confirmacion del equipo.',
    url: '/reservas/crear',
    images: [
      {
        url: absoluteUrl('/reserva.jpg'),
        width: 1200,
        height: 800,
        alt: 'Formulario de reservas AtrevidaFit',
      },
    ],
  },
};

export default function CrearReservaPage() {
  return <ReservasLanding initialModalOpen />;
}
