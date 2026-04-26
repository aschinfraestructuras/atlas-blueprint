/**
 * WorkerPicker / MemberPicker — Seletor de trabalhadores da equipa de obra
 *
 * Lê de project_workers (módulo Equipa) e não de project_members (utilizadores
 * com login). O "responsável" por um RFI/Submittal é um membro da equipa de
 * obra (TQ, encarregado, soldador, etc.), não necessariamente alguém com login.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

interface Worker {
  id: string;
  name: string;
  role_function: string | null;
  company: string | null;
}

interface Props {
  value: string | null | undefined;
  onChange: (workerId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
}

export function MemberPicker({ value, onChange, placeholder, disabled, allowEmpty = true }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProject) return;
    let cancelled = false;
    setLoading(true);
    (supabase as any)
      .from("project_workers")
      .select("id, name, role_function, company")
      .eq("project_id", activeProject.id)
      .order("name")
      .then(({ data }: any) => { if (!cancelled) setWorkers(data ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeProject]);

  const current = value && value.trim() ? value : NONE;
  const handleChange = (v: string) => onChange(v === NONE ? null : v);

  return (
    <Select value={current} onValueChange={handleChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? t("team.selectWorker", { defaultValue: "Selecionar membro da equipa…" })} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && (
          <SelectItem value={NONE}>
            — {t("members.none", { defaultValue: "Sem responsável" })} —
          </SelectItem>
        )}
        {workers.map(w => (
          <SelectItem key={w.id} value={w.id}>
            {w.name}
            {w.role_function ? ` · ${w.role_function}` : ""}
            {w.company ? ` (${w.company})` : ""}
          </SelectItem>
        ))}
        {!loading && workers.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {t("team.noWorkersYet", { defaultValue: "Sem trabalhadores. Adiciona primeiro no módulo Equipa." })}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
