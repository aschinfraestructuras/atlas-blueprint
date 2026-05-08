/**
 * PameValidationBadge — feedback visual da validação PAME na betonagem
 */
import { useTranslation } from "react-i18next";
import type { PameValidationResult } from "@/hooks/usePameValidation";
import { CheckCircle2, AlertTriangle, XCircle, Loader2, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  validation: PameValidationResult;
  compact?: boolean;
}

export function PameValidationBadge({ validation, compact = false }: Props) {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.startsWith("es");

  if (validation.loading) return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {isEs ? "Verificando PAME..." : "A verificar PAME..."}
    </div>
  );

  if (!validation.materialName) return null;

  const hasErrors   = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const allOk = !hasErrors && !hasWarnings && validation.materialApproved && validation.supplierApproved;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 border",
        allOk ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
          : hasErrors ? "bg-destructive/10 text-destructive border-destructive/30"
          : "bg-amber-500/10 text-amber-700 border-amber-500/30"
      )}>
        {allOk ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          : hasErrors ? <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
          : <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />}
        <span>
          {allOk ? `PAME ✅ ${validation.materialName}`
            : hasErrors ? (isEs ? "PAME ❌ No aprobado" : "PAME ❌ Não aprovado")
            : `PAME ⚠ ${validation.materialName}`}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl border p-3 space-y-2 text-xs",
      allOk ? "bg-emerald-500/5 border-emerald-500/30"
        : hasErrors ? "bg-destructive/5 border-destructive/30"
        : "bg-amber-500/5 border-amber-500/30"
    )}>
      <div className="flex items-center gap-1.5 font-semibold">
        <PackageCheck className="h-3.5 w-3.5" />
        {isEs ? "Verificación PAME" : "Verificação PAME"}
      </div>
      <div className="flex items-center gap-2">
        {validation.materialApproved
          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          : <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />}
        <span>
          {isEs ? "Material: " : "Material: "}
          <span className="font-medium">{validation.materialName}</span>
          {" — "}
          {validation.materialApproved
            ? <span className="text-emerald-700">{isEs ? "Aprobado" : "Aprovado"}</span>
            : <span className="text-amber-700">{isEs ? "Pendiente" : "Pendente"}</span>}
        </span>
      </div>
      {validation.supplierApproved !== undefined && (
        <div className="flex items-center gap-2">
          {validation.supplierApproved
            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
            : <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
          <span>
            {isEs ? "Proveedor: " : "Fornecedor: "}
            {validation.supplierApproved
              ? <span className="text-emerald-700">{isEs ? "Aprobado en PAME" : "Aprovado na PAME"}</span>
              : <span className="text-destructive">{isEs ? "No aprobado en PAME" : "Não aprovado na PAME"}</span>}
          </span>
        </div>
      )}
      {validation.lotRef && (
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <span>
            {isEs ? "Lote disponible: " : "Lote disponível: "}
            <span className="font-mono font-medium">{validation.lotRef}</span>
            <span className="text-muted-foreground"> {isEs ? "(auto-asociado)" : "(auto-associado)"}</span>
          </span>
        </div>
      )}
      {validation.warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /><span>{w}</span>
        </div>
      ))}
      {validation.errors.map((e, i) => (
        <div key={i} className="flex items-start gap-2 text-destructive">
          <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" /><span>{e}</span>
        </div>
      ))}
    </div>
  );
}
