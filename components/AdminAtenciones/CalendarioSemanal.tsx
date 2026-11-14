'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { AdminPanel, EmptyState } from '@/components/AdminConfig';
import { formatDiaCorto } from '@/components/AdminReservas';
import { todayISO } from '@/lib/utils/format';
import { recortarConPrioridad } from '@/lib/utils/recortarConPrioridad';
import styles from './CalendarioSemanal.module.css';

/** Resumen de la vista con su interruptor a la derecha. Va siempre sobre el calendario o la lista, en el mismo sitio. */
export function CabeceraVista({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className={styles.heading}>
      <CalendarDays size={16} aria-hidden="true" />
      <strong>{titulo}</strong>
      {children && <div className={styles.accion}>{children}</div>}
    </div>
  );
}

interface CalendarioSemanalProps<T> {
  /** Días a mostrar, YYYY-MM-DD. */
  dias: string[];
  eventos: T[];
  fechaDe: (evento: T) => string;
  claveDe: (evento: T) => string | number;
  onAbrir: (evento: T) => void;
  /** Contenido de cada tarjeta; usar CalendarioEvento. */
  renderEvento: (evento: T) => React.ReactNode;
  /** Mensaje cuando la semana completa no tiene eventos. */
  vacio: { title: string; hint?: string };
  maxPorDia?: number;
  /** Eventos que requieren acción. Nunca quedan tras "Ver más": el corte de maxPorDia los conserva y completa con los primeros del día. */
  esPendiente?: (evento: T) => boolean;
  /** Mientras carga se atenúa y no se dice "sin eventos". */
  loading?: boolean;
}

/**
 * Calendario semanal de Atenciones (Personal e Insumos). Un solo diseño: cada pestaña dice qué eventos
 * muestra y cómo se llena la tarjeta. Sin caja propia: las tarjetas van sobre el fondo, igual que la lista.
 * Una semana sin eventos muestra un solo aviso, no uno por día.
 */
export function CalendarioSemanal<T>({
  dias, eventos, fechaDe, claveDe, onAbrir, renderEvento, vacio, maxPorDia = 4, esPendiente, loading = false,
}: CalendarioSemanalProps<T>) {
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  const hoy = todayISO();
  const porDia = useMemo(() => {
    const mapa = new Map<string, T[]>(dias.map((dia) => [dia, []]));
    eventos.forEach((evento) => mapa.get(fechaDe(evento))?.push(evento));
    return mapa;
  }, [dias, eventos, fechaDe]);

  const alternar = (dia: string) => setExpandidos((actual) => {
    const siguiente = new Set(actual);
    if (!siguiente.delete(dia)) siguiente.add(dia);
    return siguiente;
  });

  if (eventos.length === 0) {
    return (
      <AdminPanel card>
        <EmptyState loading={loading} title={loading ? 'Cargando…' : vacio.title} hint={vacio.hint} />
      </AdminPanel>
    );
  }

  return (
    <AdminPanel card className={`${styles.contenedor} ${loading ? styles.recargando : ''}`}>
      <div className={styles.calendar}>
        {dias.map((dia) => {
          const delDia = porDia.get(dia) ?? [];
          const abierto = expandidos.has(dia);
          const visibles = abierto ? delDia : recortarConPrioridad(delDia, maxPorDia, esPendiente);
          const ocultos = delDia.length - visibles.length;
          return (
            <section key={dia} className={`${styles.day} ${dia === hoy ? styles.hoy : ''} ${delDia.length === 0 ? styles.sinEventos : ''}`}>
              <header>
                <span className={styles.fecha}>{formatDiaCorto(dia)}</span>
                {delDia.length > 0 && <small className={styles.cantidad}>{delDia.length}</small>}
              </header>
              <div className={styles.events}>
                {visibles.map((evento) => (
                  <button key={claveDe(evento)} type="button" className={styles.event} onClick={() => onAbrir(evento)}>
                    {renderEvento(evento)}
                  </button>
                ))}
                {(ocultos > 0 || abierto) && delDia.length > maxPorDia && (
                  <button type="button" className={styles.more} aria-expanded={abierto} onClick={() => alternar(dia)}>
                    {abierto ? 'Ver menos' : `Ver ${ocultos} más`}
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </AdminPanel>
  );
}
