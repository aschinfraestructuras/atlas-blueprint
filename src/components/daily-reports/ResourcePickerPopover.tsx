import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, User, Wrench, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import { projectWorkerService, type ProjectWorker } from "@/lib/services/projectWorkerService";
import { projectMachineryService, type ProjectMachinery } from "@/lib/services/projectMachineryService";

interface Subcontractor {
  id: string;
  name: string;
}

interface CompanyOption {
  id: string | null;
  name: string;
}

// ─── Worker Picker ───────────────────────────────────────────────────────────

interface WorkerPickerProps {
  onSelect: (worker: ProjectWorker) => void;
  onManual: () => void;
  disabled?: boolean;
}

export function WorkerPickerPopover({ onSelect, onManual, disabled }: WorkerPickerProps) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null | undefined>(undefined);
  const [workers, setWorkers] = useState<ProjectWorker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Load subcontractors list
  useEffect(() => {
    if (!open || !activeProject) return;
    (async () => {
      const { data } = await supabase
        .from("subcontractors")
        .select("id, name")
        .eq("project_id", activeProject.id)
        .eq("status", "active")
        .order("name");
      const subs: CompanyOption[] = (data ?? []).map((s: Subcontractor) => ({ id: s.id, name: s.name }));
      setCompanies([{ id: null, name: "ASCH" }, ...subs]);
      setSelectedCompany(undefined);
      setWorkers([]);
    })();
  }, [open, activeProject]);

  // Load workers when company selected
  useEffect(() => {
    if (selectedCompany === undefined || !activeProject) return;
    setLoadingWorkers(true);
    projectWorkerService.list(activeProject.id, selectedCompany).then(all => {
      setWorkers(all.filter(w => w.status === "active"));
      setLoadingWorkers(false);
    });
  }, [selectedCompany, activeProject]);

  const handleSelect = (worker: ProjectWorker) => {
    onSelect(worker);
    setOpen(false);
    setSelectedCompany(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("common.create")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {selectedCompany === undefined ? (
          // Step 1: Select company
          <div>
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-medium text-muted-foreground">{t("dailyReports.picker.selectCompany")}</p>
            </div>
            <ScrollArea className="max-h-60">
              {companies.map(c => (
                <button
                  key={c.id ?? "__asch"}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedCompany(c.id)}
                >
                  <span className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.name}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </ScrollArea>
            <div className="border-t">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                onClick={() => { onManual(); setOpen(false); }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("dailyReports.picker.manualEntry")}
              </button>
            </div>
          </div>
        ) : (
          // Step 2: Select worker
          <div>
            <div className="px-3 py-2 border-b flex items-center gap-2">
              <button className="text-xs text-primary hover:underline" onClick={() => setSelectedCompany(undefined)}>
                ← {t("common.back")}
              </button>
              <span className="text-xs text-muted-foreground">
                {workers.length} {t("dailyReports.picker.activeWorkers")}
              </span>
            </div>
            <ScrollArea className="max-h-60">
              {loadingWorkers ? (
                <div className="p-4 text-center text-xs text-muted-foreground">{t("common.loading")}</div>
              ) : workers.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">{t("common.noData")}</div>
              ) : workers.map(w => (
                <button
                  key={w.id}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelect(w)}
                >
                  <div className="text-left">
                    <div className="font-medium">{w.name}</div>
                    {w.role_function && <div className="text-xs text-muted-foreground">{w.role_function}</div>}
                  </div>
                  <Badge
                    variant="outline"
                    className={w.has_safety_training
                      ? "text-green-700 border-green-300 dark:text-green-400 dark:border-green-700 text-[10px]"
                      : "text-red-700 border-red-300 dark:text-red-400 dark:border-red-700 text-[10px]"
                    }
                  >
                    {w.has_safety_training ? t("dailyReports.picker.safetyOk") : t("dailyReports.picker.noSafety")}
                  </Badge>
                </button>
              ))}
            </ScrollArea>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Equipment Picker ────────────────────────────────────────────────────────

interface EquipmentPickerProps {
  onSelect: (equip: ProjectMachinery) => void;
  onManual: () => void;
  disabled?: boolean;
}

export function EquipmentPickerPopover({ onSelect, onManual, disabled }: EquipmentPickerProps) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null | undefined>(undefined);
  const [equipList, setEquipList] = useState<ProjectMachinery[]>([]);
  const [loadingEquip, setLoadingEquip] = useState(false);

  useEffect(() => {
    if (!open || !activeProject) return;
    (async () => {
      const { data } = await supabase
        .from("subcontractors")
        .select("id, name")
        .eq("project_id", activeProject.id)
        .eq("status", "active")
        .order("name");
      const subs: CompanyOption[] = (data ?? []).map((s: Subcontractor) => ({ id: s.id, name: s.name }));
      setCompanies([{ id: null, name: "ASCH" }, ...subs]);
      setSelectedCompany(undefined);
      setEquipList([]);
    })();
  }, [open, activeProject]);

  useEffect(() => {
    if (selectedCompany === undefined || !activeProject) return;
    setLoadingEquip(true);
    projectMachineryService.list(activeProject.id, selectedCompany).then(all => {
      setEquipList(all.filter(e => e.status === "on_site"));
      setLoadingEquip(false);
    });
  }, [selectedCompany, activeProject]);

  const handleSelect = (equip: ProjectMachinery) => {
    onSelect(equip);
    setOpen(false);
    setSelectedCompany(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("common.create")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {selectedCompany === undefined ? (
          <div>
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-medium text-muted-foreground">{t("dailyReports.picker.selectCompany")}</p>
            </div>
            <ScrollArea className="max-h-60">
              {companies.map(c => (
                <button
                  key={c.id ?? "__asch"}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedCompany(c.id)}
                >
                  <span className="flex items-center gap-2">
                    <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.name}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </ScrollArea>
            <div className="border-t">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                onClick={() => { onManual(); setOpen(false); }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("dailyReports.picker.manualEntry")}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="px-3 py-2 border-b flex items-center gap-2">
              <button className="text-xs text-primary hover:underline" onClick={() => setSelectedCompany(undefined)}>
                ← {t("common.back")}
              </button>
              <span className="text-xs text-muted-foreground">
                {equipList.length} {t("dailyReports.picker.onSiteEquipment")}
              </span>
            </div>
            <ScrollArea className="max-h-60">
              {loadingEquip ? (
                <div className="p-4 text-center text-xs text-muted-foreground">{t("common.loading")}</div>
              ) : equipList.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">{t("common.noData")}</div>
              ) : equipList.map(e => (
                <button
                  key={e.id}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelect(e)}
                >
                  <div className="text-left">
                    <div className="font-medium">{e.designation}</div>
                    <div className="text-xs text-muted-foreground">
                      {[e.type, e.plate, e.sound_power_db ? `${e.sound_power_db} dB` : null].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
