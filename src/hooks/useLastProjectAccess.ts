import { useCallback, useEffect, useState } from "react";

/**
 * Tracks "last accessed" timestamp per project, locally.
 * Pure client-side — does not touch ProjectContext, AuthContext or the database.
 */

const STORAGE_KEY = "atlas_project_last_access";

type AccessMap = Record<string, string>; // projectId -> ISO timestamp

function read(): AccessMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function write(map: AccessMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / privacy mode
  }
}

export function markProjectAccessed(projectId: string): void {
  const map = read();
  map[projectId] = new Date().toISOString();
  write(map);
}

export function useLastProjectAccess() {
  const [map, setMap] = useState<AccessMap>(() => read());

  // Re-read when other tabs update it
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setMap(read());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const mark = useCallback((projectId: string) => {
    markProjectAccessed(projectId);
    setMap(read());
  }, []);

  const getLastAccess = useCallback(
    (projectId: string): Date | null => {
      const iso = map[projectId];
      return iso ? new Date(iso) : null;
    },
    [map],
  );

  // Most recently accessed project id (or null)
  const lastAccessedId: string | null = (() => {
    const entries = Object.entries(map);
    if (entries.length === 0) return null;
    entries.sort((a, b) => (a[1] < b[1] ? 1 : -1));
    return entries[0][0];
  })();

  return { mark, getLastAccess, lastAccessedId };
}
