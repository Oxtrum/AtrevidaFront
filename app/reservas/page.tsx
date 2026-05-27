import type { Metadata } from 'next';
import { absoluteUrl, siteName } from '@/lib/seo';
import ReservasLanding from './ReservasLanding';

export const metadata: Metadata = {
  title: 'Reservas online de tratamientos esteticos',
  description:
    'Agenda una evaluacion gratuita o reserva tratamientos corporales y faciales en AtrevidaFit Cochabamba. El equipo confirma tu horario y te orienta antes de comenzar.',
  alternates: {
    canonical: '/reservas',
  },
  openGraph: {
    title: 'Reservas online de tratamientos esteticos | AtrevidaFit',
    description:
      'Reserva tu evaluacion gratuita o tratamiento estetico en Cochabamba con confirmacion del equipo AtrevidaFit.',
    url: '/reservas',
    images: [
      {
        url: absoluteUrl('/reserva.jpg'),
        width: 1200,
        height: 800,
        alt: 'Reserva de tratamientos esteticos en AtrevidaFit',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reservas online de tratamientos esteticos | AtrevidaFit',
    description:
      'Agenda tu evaluacion gratuita o tratamiento estetico en Cochabamba con AtrevidaFit.',
    images: [absoluteUrl('/reserva.jpg')],
  },
};

export default function ReservasPage() {
  const reservationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Reservas online de tratamientos esteticos',
    url: absoluteUrl('/reservas'),
    isPartOf: {
      '@type': 'WebSite',
      name: siteName,
      url: absoluteUrl('/'),
    },
    potentialAction: {
      '@type': 'ReserveAction',
      target: absoluteUrl('/reservas/crear'),
      result: {
        '@type': 'Reservation',
        name: 'Reserva de cita en AtrevidaFit',
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reservationSchema) }}
      />
      <ReservasLanding />
    </>
  );
}
