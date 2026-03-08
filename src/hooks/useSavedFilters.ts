import { useState, useCallback } from "react";

interface SavedFilter {
  id: string;
  name: string;
  values: Record<string, string>;
}

const STORAGE_PREFIX = "atlas_filters_";

/**
 * Hook to persist named filter presets per module in localStorage.
 * @param moduleKey Unique identifier e.g. "documents", "nc", "materials"
 */
export function useSavedFilters(moduleKey: string) {
  const storageKey = `${STORAGE_PREFIX}${moduleKey}`;

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((filters: SavedFilter[]) => {
    setSavedFilters(filters);
    localStorage.setItem(storageKey, JSON.stringify(filters));
  }, [storageKey]);

  const saveFilter = useCallback((name: string, values: Record<string, string>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = [...savedFilters, { id, name, values }];
    persist(next);
    return id;
  }, [savedFilters, persist]);

  const deleteFilter = useCallback((id: string) => {
    persist(savedFilters.filter(f => f.id !== id));
  }, [savedFilters, persist]);

  return { savedFilters, saveFilter, deleteFilter };
}
