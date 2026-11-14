'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Search, RefreshCw, X, Inbox } from 'lucide-react';
import { nextSort, sortRows } from '@/lib/utils/sortRows';
import type { SortDirection, SortState } from '@/lib/utils/sortRows';
import { CursorPagination } from './CursorPagination';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  searchable?: boolean; // false → excluye del filtro local
  sortable?: boolean; // false → el header no ordena
  firstSort?: SortDirection; // sentido del primer click (por defecto 'asc')
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
  hideSearch?: boolean;
  /** false → ninguna columna ordena. Las tablas paginadas lo apagan hasta ordenar en el servidor. */
  sortable?: boolean;
  /** Orden inicial cuando la tabla ordena sola en el navegador. */
  defaultSort?: SortState | null;
  /**
   * Modo controlado, para tablas que ordena el servidor: con `onSortChange` la tabla no reordena las filas,
   * solo muestra `sort` y avisa del click. Sin `onSortChange` ordena en el navegador.
   */
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  /**
   * Filas por página cuando la tabla tiene todos sus datos en el navegador (50 por defecto). El paginador solo
   * aparece si hay más filas que eso. 0 lo apaga: úsalo cuando la página ya pagina por fuera. Las tablas que
   * ordena el servidor (`onSortChange`) nunca paginan aquí.
   */
  pageSize?: number;
}

const SKELETON_ROWS = 5;

function SortIcon({ dir }: { dir: SortDirection | null }) {
  const props = { size: 12, strokeWidth: 2, className: styles.sortIcon, 'aria-hidden': true } as const;
  if (dir === 'asc') return <ArrowUp {...props} />;
  if (dir === 'desc') return <ArrowDown {...props} />;
  return <ChevronsUpDown {...props} />;
}

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
  hideSearch = false,
  sortable: tableSortable = true,
  defaultSort = null,
  sort,
  onSortChange,
  pageSize = 50,
}: DataTableProps<T>) {
  const [query, setQueryState] = useState('');
  const [page, setPage] = useState(1);
  // Buscar u ordenar cambia qué filas hay: se vuelve a la primera página.
  const setQuery = (value: string) => {
    setQueryState(value);
    setPage(1);
  };
  const [localSort, setLocalSort] = useState<SortState | null>(defaultSort);
  const controlled = onSortChange !== undefined;
  const activeSort = controlled ? (sort ?? null) : localSort;

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

  // Una columna ordena solo si algun registro trae su campo; evita botones muertos en columnas de acciones.
  const sortableKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!tableSortable) return keys;
    for (const col of columns) {
      if (col.sortable === false) continue;
      if (controlled || data.some((row) => row[col.key] !== undefined)) keys.add(col.key);
    }
    return keys;
  }, [tableSortable, columns, data, controlled]);

  const visible = useMemo(
    () => (controlled || !tableSortable ? filtered : sortRows(filtered, activeSort)),
    [controlled, tableSortable, filtered, activeSort],
  );

  const handleSort = (col: Column<T>) => {
    const next = nextSort(activeSort, col.key, col.firstSort);
    if (controlled) onSortChange(next);
    else setLocalSort(next);
    setPage(1);
  };

  const paginar = !controlled && pageSize > 0;
  const totalPages = paginar ? Math.max(1, Math.ceil(visible.length / pageSize)) : 1;
  // Si los datos se achican (otro filtro, una fila borrada) la página actual puede quedar fuera de rango.
  const currentPage = Math.min(page, totalPages);
  const pageRows = paginar ? visible.slice((currentPage - 1) * pageSize, currentPage * pageSize) : visible;

  const isFiltering = query.trim().length > 0;
  const hasData = !loading && !error;

  return (
    <div className={styles.wrapper}>

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        {!hideSearch && (
          <div className={styles.searchBox}>
            <Search size={13} strokeWidth={2} className={styles.searchIcon} />
            {/* `disabled` sale correcto del servidor (loading arranca en true); algo del navegador
                (extensiones, restauración de formularios) puede quitarlo antes de hidratar y React lo
                reportaba como error. suppressHydrationWarning aplica solo a este atributo. */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className={styles.searchInput}
              disabled={Boolean(loading) || Boolean(error)}
              suppressHydrationWarning
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
        )}

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
              suppressHydrationWarning
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
              {columns.map((col) => {
                const sortable = sortableKeys.has(col.key);
                const dir = activeSort?.key === col.key ? activeSort.dir : null;
                return (
                  <th
                    key={col.key}
                    aria-sort={sortable ? (dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none') : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className={`${styles.sortButton} ${dir ? styles.sortActive : ''}`}
                        onClick={() => handleSort(col)}
                        disabled={Boolean(loading)}
                        suppressHydrationWarning
                        title={`Ordenar por ${col.label}`}
                      >
                        <span>{col.label}</span>
                        <SortIcon dir={dir} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
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
              pageRows.map((row, index) => (
                <tr
                  key={`${getRowKey(row)}-${index}`}
                  className={onRowClick ? styles.clickableRow : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick(row);
                    }
                  } : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
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

      {hasData && totalPages > 1 && (
        <div className={styles.paginationRow}>
          <CursorPagination
            page={currentPage}
            totalPages={totalPages}
            hasNext={currentPage < totalPages}
            onPrevious={() => setPage(currentPage - 1)}
            onNext={() => setPage(currentPage + 1)}
          />
        </div>
      )}
    </div>
  );
}