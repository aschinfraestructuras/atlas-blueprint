/**
 * MemberPicker — Seletor reutilizável de membros do projeto
 *
 * Resolve o problema de campos UUID (assigned_to) que recebiam texto livre.
 * Lista membros ativos do projeto e devolve o user_id (UUID).
 * Inclui opção "— Sem responsável —" para limpar a seleção.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProject } from "@/contexts/ProjectContext";
import { memberService, type ProjectMember } from "@/lib/services/memberService";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

interface Props {
  /** UUID do membro selecionado (ou null/"") */
  value: string | null | undefined;
  /** Callback recebe o UUID ou null */
  onChange: (userId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Permite fallback de texto livre se a lista de membros estiver vazia */
  allowEmpty?: boolean;
}

export function MemberPicker({ value, onChange, placeholder, disabled, allowEmpty = true }: Props) {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeProject) return;
    let cancelled = false;
    setLoading(true);
    memberService.getMembers(activeProject.id)
      .then(list => { if (!cancelled) setMembers(list); })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeProject]);

  const current = value && value.trim() ? value : NONE;
  const handleChange = (v: string) => onChange(v === NONE ? null : v);

  const displayName = (m: ProjectMember) =>
    m.profile?.full_name?.trim() || m.profile?.email || m.user_id.slice(0, 8);

  return (
    <Select value={current} onValueChange={handleChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? t("members.selectPlaceholder", { defaultValue: "Selecionar responsável…" })} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && (
          <SelectItem value={NONE}>
            — {t("members.none", { defaultValue: "Sem responsável" })} —
          </SelectItem>
        )}
        {members.map(m => (
          <SelectItem key={m.user_id} value={m.user_id}>
            {displayName(m)}
            {m.role ? ` · ${m.role}` : ""}
          </SelectItem>
        ))}
        {!loading && members.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {t("members.empty", { defaultValue: "Nenhum membro no projeto. Convide membros em Definições → Equipa." })}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
