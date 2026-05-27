'use client';

import { useMemo, useState } from 'react';
import { Pencil, Search, RefreshCw, X, Inbox } from 'lucide-react';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  searchable?: boolean; // false → excluye del filtro local
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onEdit?: (item: T) => void;
  onRowClick?: (item: T) => void;
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
  onRowClick,
  getRowKey,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'No hay datos disponibles',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');

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

  const isFiltering = query.trim().length > 0;
  const hasData = !loading && !error;

  return (
    <div className={styles.wrapper}>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={13} strokeWidth={2} className={styles.searchIcon} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className={styles.searchInput}
            disabled={Boolean(loading) || Boolean(error)}
            aria-label="Filtrar resultados"
          />
          {isFiltering && (
            <button
              type="button"
              className={styles.clearSearchInline}
              onClick={() => setQuery('')}
              aria-label="Limpiar búsqueda"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <div className={styles.toolbarRight}>
          {hasData && (
            <span className={styles.rowCount}>
              <span className={styles.rowCountHighlight}>{filtered.length}</span>
              {' '}
              {filtered.length === 1 ? 'registro' : 'registros'}
              {isFiltering && data.length !== filtered.length && (
                <span className={styles.rowCountTotal}>&nbsp;de {data.length}</span>
              )}
            </span>
          )}
          {onRefresh && (
            <button
              className={styles.refreshButton}
              onClick={onRefresh}
              aria-label="Actualizar tabla"
              disabled={Boolean(loading)}
              title="Actualizar"
            >
              <RefreshCw
                size={13}
                strokeWidth={1.8}
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
              {onEdit && <th style={{ width: 96 }} />}
            </tr>
          </thead>
          <tbody>

            {/* Skeleton */}
            {loading &&
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={`sk-${i}`} className={styles.skeletonRow}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div
                        className={styles.skeletonCell}
                        style={{ width: `${55 + (i * 13 + col.key.length * 7) % 38}%` }}
                      />
                    </td>
                  ))}
                  {onEdit && (
                    <td>
                      <div className={styles.skeletonCell} style={{ width: 72, marginLeft: 'auto' }} />
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
            {hasData && filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + (onEdit ? 1 : 0)}>
                  <div className={styles.empty}>
                    <div className={styles.emptyIcon}>
                      <Inbox size={20} strokeWidth={1.5} />
                    </div>
                    <p className={styles.emptyTitle}>
                      {isFiltering ? `Sin resultados para "${query}"` : emptyMessage}
                    </p>
                    {isFiltering ? (
                      <>
                        <p className={styles.emptyHint}>Prueba con otro término de búsqueda</p>
                        <button className={styles.clearSearch} onClick={() => setQuery('')}>
                          Limpiar búsqueda
                        </button>
                      </>
                    ) : (
                      <p className={styles.emptyHint}>Ajusta los filtros para ver resultados</p>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {hasData &&
              filtered.map((row, index) => (
                <tr
                  key={`${getRowKey(row)}-${index}`}
                  onClick={() => onRowClick?.(row)}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map((col) => (
                    <td key={`${col.key}-${index}`}>
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
                          aria-label="Editar fila"
                        >
                          <Pencil size={12} strokeWidth={2} />
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