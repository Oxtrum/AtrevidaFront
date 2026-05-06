'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { DiaSemana } from '@/types/reserva';
import { CalendarAdmin } from '@/components/Calendar';
import Header from '@/components/Header/Header';
import styles from './page.module.css';

/**
 * AdminReservasPage - Página de gestión de reservas para administrador
 * Muestra calendario con detalles completos:
 * - Nombres de clientes
 * - Servicios contratados
 * - Tipo de reserva (mesa, bicicleta)
 */
export default function AdminReservasPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [sucursalActiva, setSucursalActiva] = useState('');
  const [semanaActiva, setSemanaActiva] = useState('');

  // Verificar autenticación admin
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
    }
  }, [router]);

  // Animaciones GSAP
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(headerRef.current, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 })
        .fromTo(calendarRef.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.2');
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSlotClick = (hora: string, dia: DiaSemana, slots: any) => {
    // Extraer hora_desde y hora_hasta del formato "8:00 a 8:30"
    // Si el formato es incompleto (ej: "9"), normalizar a "9:00"
    let hora_desde: string, hora_hasta: string;

    if (hora.includes(' a ')) {
      // Formato completo: "8:00 a 8:30"
      const partes = hora.split(' a ').map(h => h.trim());
      hora_desde = partes[0] || '';
      hora_hasta = partes[1] || '';
    } else {
      // Formato incompleto: solo "9" -> normalizar a "9:00"
      hora_desde = hora.includes(':') ? hora : `${hora}:00`;
      // Calcular hora_hasta: siguiente slot de 30 min
      const [hh, mm] = hora_desde.split(':').map(Number);
      const minutos = (mm || 0) + 30;
      if (minutos >= 60) {
        hora_hasta = `${(hh + 1).toString().padStart(2, '0')}:00`;
      } else {
        hora_hasta = `${hh.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
      }
    }

    // Guardar en localStorage que viene del admin
    if (typeof window !== 'undefined') {
      localStorage.setItem('reservaFromAdmin', 'true');
    }

    const params = new URLSearchParams({
      local: sucursalActiva,
      semana: semanaActiva,
      dia: dia,
      hora_desde,
      hora_hasta,
    });

    // Ir a la página de crear reserva
    router.push(`/reservas/crear?${params.toString()}`);
  };

  const handleSucursalChange = (sucursal: string) => {
    setSucursalActiva(sucursal);
  };

  const handleSemanaChange = (semana: string) => {
    setSemanaActiva(semana);
  };

  return (
    <div ref={containerRef} className={styles.pageContainer}>
      <Header />
      <main className={styles.main}>
        <div ref={headerRef} className={styles.header}>
          <div>
            <h1 className={styles.title}>Gestión de Reservas</h1>
            <p className={styles.subtitle}>
              Vista detallada de todas las reservas. Haz clic en el (+) para crear una nueva reserva
            </p>
          </div>
        </div>

        <div ref={calendarRef} className={styles.calendarSection}>
          <CalendarAdmin
            localInicial="SAN MARTIN"
            onSlotClick={handleSlotClick}
            onSucursalChange={handleSucursalChange}
            onSemanaChange={handleSemanaChange}
          />
        </div>
      </main>
    </div>
  );
}
