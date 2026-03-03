/**
 * usePaginatedQuery — generic hook for server-side paginated lists.
 *
 * Works with any Supabase table that supports .range() and count.
 * Returns page data, total count, and page controls.
 */

import { useState, useCallback, useEffect, useRef } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  refetch: () => void;
}

export type FetchPageFn<T> = (params: {
  from: number;
  to: number;
  pageSize: number;
}) => Promise<{ data: T[]; count: number }>;

export function usePaginatedQuery<T>(
  fetchFn: FetchPageFn<T> | null,
  deps: unknown[] = [],
  initialPageSize = 25,
): PaginatedResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Reset to page 1 when deps or pageSize change
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, pageSize]);

  const fetch = useCallback(async () => {
    if (!fetchFn) {
      setData([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const result = await fetchFn({ from, to, pageSize });
      if (mountedRef.current) {
        setData(result.data);
        setTotal(result.count);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, page, pageSize, ...deps]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data,
    loading,
    error,
    pagination: { page, pageSize, total, totalPages },
    setPage,
    setPageSize: (size: number) => { setPageSize(size); setPage(1); },
    refetch: fetch,
  };
}
