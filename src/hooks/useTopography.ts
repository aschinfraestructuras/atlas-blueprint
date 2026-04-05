import { useEffect, useState, useCallback } from "react";
import { useProject } from "@/contexts/ProjectContext";
import {
  topographyEquipmentService,
  calibrationService,
  topographyRequestService,
  topographyControlService,
  type TopographyEquipment,
  type EquipmentCalibration,
  type TopographyRequest,
  type TopographyControl,
} from "@/lib/services/topographyService";

export function useTopographyEquipment() {
  const { activeProject } = useProject();
  const [data, setData] = useState<TopographyEquipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    setError(null);
    try {
      setData(await topographyEquipmentService.getByProject(activeProject.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar equipamentos");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export function useCalibrations(equipmentId?: string) {
  const { activeProject } = useProject();
  const [data, setData] = useState<EquipmentCalibration[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    try {
      if (equipmentId) {
        setData(await calibrationService.getByEquipment(equipmentId));
      } else {
        setData(await calibrationService.getByProject(activeProject.id));
      }
    } catch { /* swallow */ } finally {
      setLoading(false);
    }
  }, [activeProject, equipmentId]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);
  return { data, loading, refetch: fetch };
}

export function useTopographyRequests() {
  const { activeProject } = useProject();
  const [data, setData] = useState<TopographyRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    try {
      setData(await topographyRequestService.getByProject(activeProject.id));
    } catch { /* swallow */ } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);
  return { data, loading, refetch: fetch };
}

export function useTopographyControls() {
  const { activeProject } = useProject();
  const [data, setData] = useState<TopographyControl[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!activeProject) { setData([]); return; }
    setLoading(true);
    try {
      setData(await topographyControlService.getByProject(activeProject.id));
    } catch { /* swallow */ } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    let cancelled = false;
    fetch().catch(() => {});
    return () => { cancelled = true; };
  }, [fetch]);
  return { data, loading, refetch: fetch };
}
