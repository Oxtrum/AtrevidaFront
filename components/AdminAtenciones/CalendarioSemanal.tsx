'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { AdminPanel } from '@/components/AdminConfig';
import { formatDiaCorto } from '@/components/AdminReservas';
import { todayISO } from '@/lib/utils/format';
import styles from './CalendarioSemanal.module.css';

/** Título de la vista con su interruptor a la derecha. Va dentro del calendario o suelto sobre la lista. */
export function CabeceraVista({ titulo, suelta = false, children }: { titulo: string; suelta?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`${styles.heading} ${suelta ? styles.suelta : ''}`}>
      <CalendarDays size={16} aria-hidden="true" />
      <strong>{titulo}</strong>
      {children && <div className={styles.accion}>{children}</div>}
    </div>
  );
}

interface CalendarioSemanalProps<T> {
  /** Cabecera de la vista: usar CabeceraVista. */
  cabecera: React.ReactNode;
  /** Días a mostrar, YYYY-MM-DD. */
  dias: string[];
  eventos: T[];
  fechaDe: (evento: T) => string;
  claveDe: (evento: T) => string | number;
  onAbrir: (evento: T) => void;
  /** Contenido de cada tarjeta; usar CalendarioEvento. */
  renderEvento: (evento: T) => React.ReactNode;
  /** Texto de un día sin eventos. */
  vacio: string;
  acento?: 'primary' | 'secondary';
  maxPorDia?: number;
  /** Mientras carga se atenúa y no se dice "sin eventos". */
  loading?: boolean;
}

/**
 * Calendario semanal de Atenciones (Personal e Insumos). Un solo diseño: cada pestaña dice qué eventos
 * muestra y cómo se llena la tarjeta.
 */
export function CalendarioSemanal<T>({
  cabecera, dias, eventos, fechaDe, claveDe, onAbrir, renderEvento, vacio, acento = 'primary', maxPorDia = 4, loading = false,
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

  return (
    <AdminPanel className={`${styles.panel} ${acento === 'secondary' ? styles.secondary : ''} ${loading ? styles.recargando : ''}`}>
      {cabecera}
      <div className={styles.calendar}>
        {dias.map((dia) => {
          const delDia = porDia.get(dia) ?? [];
          const abierto = expandidos.has(dia);
          const visibles = abierto ? delDia : delDia.slice(0, maxPorDia);
          return (
            <section key={dia} className={`${styles.day} ${dia === hoy ? styles.hoy : ''}`}>
              <header><span>{formatDiaCorto(dia)}</span><small>{delDia.length}</small></header>
              <div className={styles.events}>
                {delDia.length === 0 && !loading && <p className={styles.vacio}>{vacio}</p>}
                {visibles.map((evento) => (
                  <button key={claveDe(evento)} type="button" className={styles.event} onClick={() => onAbrir(evento)}>
                    {renderEvento(evento)}
                  </button>
                ))}
                {delDia.length > maxPorDia && (
                  <button type="button" className={styles.more} onClick={() => alternar(dia)}>
                    {abierto ? 'Ver menos' : `Ver ${delDia.length - maxPorDia} más`}
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
