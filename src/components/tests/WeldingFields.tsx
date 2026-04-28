/**
 * WeldingFields — campos específicos para ensaios de soldadura
 * Aparece automaticamente quando o ensaio é PE-D3.11, PE-D3.12, PE-V02 ou TST-WELD-VIS
 * Os dados são guardados em result_payload (JSONB) — sem alterações à BD
 */
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Flame } from "lucide-react";

export const WELDING_TEST_CODES = ["PE-D3.11", "PE-D3.12", "PE-V02", "TST-WELD-VIS"];

export interface WeldingPayload {
  joint_number?: string;
  welder_name?: string;
  welder_cert_number?: string;       // N.º qualificação EN 9606
  welding_kit_ref?: string;          // Ref. kit de solda (para aluminotérmica)
  welding_kit_lot?: string;          // N.º lote do kit
  visual_result?: "ok" | "nc" | "";
  visual_notes?: string;
  us_operator_name?: string;         // Para PE-D3.12 e PE-V02
  us_operator_cert_level?: string;   // Nível I, II, III
  us_result?: "conforme" | "nao_conforme" | "";
  us_indication_mm?: string;         // Indicação máxima encontrada em mm
}

interface Props {
  testCode: string;
  value: WeldingPayload;
  onChange: (v: WeldingPayload) => void;
  disabled?: boolean;
}

export function WeldingFields({ testCode, value, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const isAluminothermic = testCode === "PE-D3.11";
  const isUltrasound = testCode === "PE-D3.12" || testCode === "PE-V02";
  const isVisual = testCode === "TST-WELD-VIS";

  const set = (key: keyof WeldingPayload, val: string) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <Flame className="h-3.5 w-3.5 text-amber-600" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
          {t("tests.welding.sectionTitle", { defaultValue: "Dados Específicos de Soldadura" })}
        </p>
      </div>

      {/* Campos comuns a todos os tipos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("tests.welding.jointNumber", { defaultValue: "N.º Junta" })}</Label>
          <Input
            value={value.joint_number ?? ""}
            onChange={e => set("joint_number", e.target.value)}
            placeholder="ex: J-001"
            className="h-8 text-xs"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("tests.welding.welderName", { defaultValue: "Nome do Soldador" })}</Label>
          <Input
            value={value.welder_name ?? ""}
            onChange={e => set("welder_name", e.target.value)}
            placeholder="Nome completo"
            className="h-8 text-xs"
            disabled={disabled}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">{t("tests.welding.welderCert", { defaultValue: "N.º Qualificação Soldador (EN 9606)" })}</Label>
          <Input
            value={value.welder_cert_number ?? ""}
            onChange={e => set("welder_cert_number", e.target.value)}
            placeholder="ex: EN9606-1-111-W-S-t2-PF"
            className="h-8 text-xs"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Kit de solda — só para aluminotérmica */}
      {isAluminothermic && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("tests.welding.kitRef", { defaultValue: "Ref. Kit de Solda" })}</Label>
            <Input
              value={value.welding_kit_ref ?? ""}
              onChange={e => set("welding_kit_ref", e.target.value)}
              placeholder="ex: Thermit Standard 45s"
              className="h-8 text-xs"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("tests.welding.kitLot", { defaultValue: "N.º Lote Kit" })}</Label>
            <Input
              value={value.welding_kit_lot ?? ""}
              onChange={e => set("welding_kit_lot", e.target.value)}
              placeholder="ex: 2024-A-0458"
              className="h-8 text-xs"
              disabled={disabled}
            />
          </div>
        </div>
      )}

      <Separator className="opacity-30" />

      {/* Resultado visual — aluminotérmica e visual */}
      {(isAluminothermic || isVisual) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("tests.welding.visualResult", { defaultValue: "Resultado Visual" })}</Label>
            <Select
              value={value.visual_result ?? ""}
              onValueChange={v => set("visual_result", v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ok">✅ Conforme</SelectItem>
                <SelectItem value="nc">❌ Não Conforme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("tests.welding.visualNotes", { defaultValue: "Observações Visuais" })}</Label>
            <Input
              value={value.visual_notes ?? ""}
              onChange={e => set("visual_notes", e.target.value)}
              placeholder="Descrição de eventuais defeitos"
              className="h-8 text-xs"
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Campos de ultrassons */}
      {isUltrasound && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("tests.welding.usOperator", { defaultValue: "Operador US" })}</Label>
            <Input
              value={value.us_operator_name ?? ""}
              onChange={e => set("us_operator_name", e.target.value)}
              placeholder="Nome do operador"
              className="h-8 text-xs"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("tests.welding.usLevel", { defaultValue: "Nível Certificação" })}</Label>
            <Select
              value={value.us_operator_cert_level ?? ""}
              onValueChange={v => set("us_operator_cert_level", v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nivel_1">Nível I</SelectItem>
                <SelectItem value="nivel_2">Nível II</SelectItem>
                <SelectItem value="nivel_3">Nível III</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("tests.welding.usResult", { defaultValue: "Resultado US" })}</Label>
            <Select
              value={value.us_result ?? ""}
              onValueChange={v => set("us_result", v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("common.select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conforme">✅ Conforme</SelectItem>
                <SelectItem value="nao_conforme">❌ Não Conforme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("tests.welding.usIndication", { defaultValue: "Indicação Máx. (mm)" })}</Label>
            <Input
              value={value.us_indication_mm ?? ""}
              onChange={e => set("us_indication_mm", e.target.value)}
              placeholder="ex: 0.3"
              className="h-8 text-xs"
              type="number"
              step="0.1"
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
