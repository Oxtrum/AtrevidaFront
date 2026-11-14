'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { getAdminLocalScope } from '@/lib/api/localScope';
import { AdminButton } from './AdminButton';
import { LocalSelect } from './LocalSelect';
import { RangoFechasFiltro } from './RangoFechasFiltro';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  children: React.ReactNode;
  /** Todos los filtros en una sola fila en pantallas anchas; en angostas se reparten en varias. */
  unaLinea?: boolean;
  /** Filtros secundarios. Quedan ocultos tras "Más filtros" y se abren dentro de la misma caja. */
  avanzados?: React.ReactNode;
  /** Abre los filtros secundarios desde el inicio (por ejemplo, cuando la URL ya trae alguno). */
  avanzadosAbiertos?: boolean;
  /** Muestra el botón Limpiar, que vuelve todos los filtros a su valor inicial. */
  onLimpiar?: () => void;
  /** Si es false, Limpiar queda deshabilitado porque no hay nada que limpiar. */
  hayFiltros?: boolean;
}

/**
 * Contenedor de filtros sobre una tabla o lista. Hijos: <FilterBar.Item label="…">control</FilterBar.Item>.
 * Es el único lugar que sabe de "Más filtros" y "Limpiar": todas las vistas se comportan igual.
 */
export function FilterBar({ children, unaLinea = false, avanzados, avanzadosAbiertos = false, onLimpiar, hayFiltros = true }: FilterBarProps) {
  const [abierto, setAbierto] = useState(avanzadosAbiertos);
  return (
    <div className={`${styles.bar} ${unaLinea ? styles.unaLinea : ''}`}>
      {children}
      {avanzados && (
        <Action>
          <AdminButton variant="secondary" size="sm" icon={<SlidersHorizontal size={14} />} onClick={() => setAbierto((actual) => !actual)} aria-expanded={abierto}>
            {abierto ? 'Menos filtros' : 'Más filtros'}
          </AdminButton>
        </Action>
      )}
      {onLimpiar && (
        <Action>
          <AdminButton variant="secondary" size="sm" icon={<X size={14} />} onClick={onLimpiar} disabled={!hayFiltros}>
            Limpiar
          </AdminButton>
        </Action>
      )}
      {avanzados && abierto && <div className={styles.avanzados}>{avanzados}</div>}
    </div>
  );
}

function Item({ label, children, grow, full, className = '' }: { label: string; children: React.ReactNode; grow?: boolean; /** Ocupa toda la fila (en `unaLinea`, tres columnas): selector de semana. */ full?: boolean; className?: string }) {
  return (
    <div className={`${styles.item} ${grow ? styles.grow : ''} ${full ? styles.full : ''} ${className}`}>
      <span className={styles.label}>{label}</span>
      {children}
    </div>
  );
}

/** Acción principal (p. ej. "Nuevo ítem") como una celda más de la cuadrícula: ocupa su ancho y alinea con los controles. */
function Action({ children, full }: { children: React.ReactNode; full?: boolean }) {
  return <div className={`${styles.action} ${full ? styles.actionFull : ''}`}>{children}</div>;
}

/** Buscador de texto; ocupa dos columnas. El debounce lo pone quien lo usa (useDebouncedValue). */
function Search({ value, onChange, placeholder = 'Cliente, reserva o servicio' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <Item label="Buscar" grow>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </Item>
  );
}

/** Filtro de local: selector para admin; para quien solo ve su local, el nombre fijo. */
function Local({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const asignado = getAdminLocalScope();
  return (
    <Item label="Local">
      {asignado
        ? <input type="text" value={asignado.nombre_local ?? 'Local asignado'} disabled aria-label="Local asignado" />
        : <LocalSelect value={value} onChange={onChange} emptyLabel="Todos los locales" />}
    </Item>
  );
}

const TODAS = [{ value: 'TODAS', label: 'Todas' }];

/** Rango de fechas en un solo campo. Vacío = todas las fechas. */
function Fechas({ desde, hasta, onChange }: { desde: string; hasta: string; onChange: (desde: string, hasta: string) => void }) {
  return (
    <Item label="Fechas">
      <RangoFechasFiltro
        atajos={TODAS}
        valor={desde || hasta ? 'RANGO' : 'TODAS'}
        onAtajo={() => onChange('', '')}
        desde={desde || hasta}
        hasta={hasta || desde}
        onRango={onChange}
      />
    </Item>
  );
}

FilterBar.Item = Item;
FilterBar.Fechas = Fechas;
FilterBar.Search = Search;
FilterBar.Local = Local;
FilterBar.Action = Action;
