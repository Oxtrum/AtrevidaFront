export const PAGE_LIMIT = 50;

export interface PaginationParams {
  limit?: number;
  cursor?: string;
  include_total?: boolean;
}

export interface PaginationMetadata {
  limit: number;
  has_more: boolean;
  next_cursor: string | null;
  total_registros?: number;
  total_paginas?: number;
}
