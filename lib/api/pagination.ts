export const PAGE_LIMIT = 50;

export interface PaginationParams {
  limit?: number;
  cursor?: string;
  include_total?: boolean;
  /** Campo por el que ordena el servidor; sin el, aplica su orden por defecto. */
  ordenar_por?: string;
  sentido?: 'asc' | 'desc';
}

export interface PaginationMetadata {
  limit: number;
  has_more: boolean;
  next_cursor: string | null;
  total_registros?: number;
  total_paginas?: number;
}
