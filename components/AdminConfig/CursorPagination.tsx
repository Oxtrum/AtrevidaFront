'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CursorPagination.module.css';

interface CursorPaginationProps {
  page: number;
  hasNext: boolean;
  totalPages?: number;
  loading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function CursorPagination({ page, hasNext, totalPages, loading = false, onPrevious, onNext }: CursorPaginationProps) {
  // Con una sola página no hay nada que navegar.
  if (page <= 1 && !hasNext) return null;
  return (
    <nav className={styles.pagination} aria-label="Paginación de resultados">
      <button type="button" onClick={onPrevious} disabled={loading || page <= 1} aria-label="Página anterior">
        <ChevronLeft size={16} /> Anterior
      </button>
      <span className={styles.pageIndicator} aria-live="polite">
        <span className={styles.currentPage}>Página {page}</span>
        {totalPages !== undefined && <span className={styles.totalPages}> de {totalPages}</span>}
      </span>
      <button type="button" onClick={onNext} disabled={loading || !hasNext} aria-label="Página siguiente">
        Siguiente <ChevronRight size={16} />
      </button>
    </nav>
  );
}
