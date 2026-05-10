'use client';

import { useMemo, useState } from 'react';
import { Pencil, Search, RefreshCw } from 'lucide-react';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  searchable?: boolean; // si false, excluye esta columna del filtro de búsqueda
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onEdit?: (item: T) => void;
  getRowKey: (item: T) => string | number;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

const SKELETON_ROWS = 5;

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  error,
  onRefresh,
  onEdit,
  getRowKey,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay datos disponibles',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');

  // Filtra por las columnas que no tengan searchable=false
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      columns
        .filter((col) => col.searchable !== false)
        .some((col) => {
          const val = row[col.key];
          return String(val ?? '').toLowerCase().includes(q);
        })
    );
  }, [data, query, columns]);

  return (
    <div className={styles.wrapper}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={14} strokeWidth={1.5} className={styles.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className={styles.searchInput}
            disabled={loading || !!error}
          />
        </div>

        <div className={styles.toolbarRight}>
          {!loading && !error && (
            <span className={styles.rowCount}>
              {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
              {query && data.length !== filtered.length && (
                <span className={styles.rowCountTotal}> de {data.length}</span>
              )}
            </span>
          )}
          {onRefresh && (
            <button
              className={styles.refreshButton}
              onClick={onRefresh}
              aria-label="Actualizar"
              disabled={loading}
            >
              <RefreshCw
                size={14}
                strokeWidth={1.5}
                className={loading ? styles.spinning : ''}
              />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className={styles.tableScrollArea}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {onEdit && <th style={{ width: 80 }} />}
            </tr>
          </thead>
          <tbody>
            {/* Skeleton */}
            {loading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={`sk-${i}`} className={styles.skeletonRow}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div className={styles.skeletonCell} style={{ width: `${60 + (i * 13 + col.key.length * 7) % 35}%` }} />
                    </td>
                  ))}
                  {onEdit && (
                    <td>
                      <div className={styles.skeletonCell} style={{ width: 64, marginLeft: 'auto' }} />
                    </td>
                  )}
                </tr>
              ))}

            {/* Error */}
            {!loading && error && (
              <tr>
                <td colSpan={columns.length + (onEdit ? 1 : 0)}>
                  <div className={styles.inlineError}>
                    <span>{error}</span>
                    {onRefresh && (
                      <button onClick={onRefresh} className={styles.retryButton}>
                        Reintentar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Empty */}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + (onEdit ? 1 : 0)}>
                  <div className={styles.empty}>
                    {query ? `Sin resultados para "${query}"` : emptyMessage}
                    {query && (
                      <button className={styles.clearSearch} onClick={() => setQuery('')}>
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading &&
              !error &&
              filtered.map((row) => (
                <tr key={getRowKey(row)}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '')}
                    </td>
                  ))}
                  {onEdit && (
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          className={styles.editButton}
                          onClick={() => onEdit(row)}
                          aria-label="Editar"
                        >
                          <Pencil size={14} strokeWidth={1.5} />
                          Editar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}