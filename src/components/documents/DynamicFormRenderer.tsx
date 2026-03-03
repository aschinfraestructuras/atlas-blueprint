import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Loader2, FileDown } from "lucide-react";

// ─── Schema types ─────────────────────────────────────────────────────────────

export interface FormFieldSchema {
  key: string;
  label?: string;
  label_pt?: string;
  label_es?: string;
  type: "text" | "number" | "textarea" | "checkbox" | "select" | "date";
  required?: boolean;
  placeholder?: string;
  placeholder_pt?: string;
  placeholder_es?: string;
  helptext_pt?: string;
  helptext_es?: string;
  options?: string[];
  defaultValue?: string | number | boolean;
}

export interface FormSchema {
  title?: string;
  title_pt?: string;
  title_es?: string;
  fields: FormFieldSchema[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DynamicFormRendererProps {
  schema: FormSchema;
  data: Record<string, unknown>;
  readOnly?: boolean;
  onSave?: (data: Record<string, unknown>) => Promise<void>;
  onExportPdf?: (data: Record<string, unknown>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFieldLabel(field: FormFieldSchema, lang: string): string {
  if (lang === "es") return field.label_es || field.label_pt || field.label || field.key;
  return field.label_pt || field.label || field.key;
}

function getFieldPlaceholder(field: FormFieldSchema, lang: string): string | undefined {
  if (lang === "es") return field.placeholder_es || field.placeholder_pt || field.placeholder;
  return field.placeholder_pt || field.placeholder;
}

function getFieldHelptext(field: FormFieldSchema, lang: string): string | undefined {
  if (lang === "es") return field.helptext_es || field.helptext_pt;
  return field.helptext_pt;
}

function getSchemaTitle(schema: FormSchema, lang: string): string | undefined {
  if (lang === "es") return schema.title_es || schema.title_pt || schema.title;
  return schema.title_pt || schema.title;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DynamicFormRenderer({ schema, data, readOnly = false, onSave, onExportPdf }: DynamicFormRendererProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    schema.fields.forEach((f) => {
      initial[f.key] = data[f.key] ?? f.defaultValue ?? (f.type === "checkbox" ? false : "");
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const setValue = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2 pt-5 px-5">
        <CardTitle className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {getSchemaTitle(schema, lang) ?? t("documents.dynamicForm.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        {schema.fields.map((field) => {
          const label = getFieldLabel(field, lang);
          const placeholder = getFieldPlaceholder(field, lang);
          const helptext = getFieldHelptext(field, lang);

          return (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>

              {field.type === "text" && (
                <Input
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  placeholder={placeholder}
                  disabled={readOnly}
                  className="text-sm"
                />
              )}

              {field.type === "number" && (
                <Input
                  type="number"
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) => setValue(field.key, e.target.value ? Number(e.target.value) : "")}
                  placeholder={placeholder}
                  disabled={readOnly}
                  className="text-sm"
                />
              )}

              {field.type === "date" && (
                <Input
                  type="date"
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  disabled={readOnly}
                  className="text-sm"
                />
              )}

              {field.type === "textarea" && (
                <Textarea
                  value={String(formData[field.key] ?? "")}
                  onChange={(e) => setValue(field.key, e.target.value)}
                  placeholder={placeholder}
                  disabled={readOnly}
                  rows={3}
                  className="text-sm"
                />
              )}

              {field.type === "checkbox" && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={!!formData[field.key]}
                    onCheckedChange={(checked) => setValue(field.key, !!checked)}
                    disabled={readOnly}
                  />
                  <span className="text-sm text-muted-foreground">{placeholder}</span>
                </div>
              )}

              {field.type === "select" && (
                <Select
                  value={String(formData[field.key] ?? "")}
                  onValueChange={(v) => setValue(field.key, v)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={placeholder ?? "..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {helptext && (
                <p className="text-[10px] text-muted-foreground">{helptext}</p>
              )}
            </div>
          );
        })}

        <div className="flex items-center gap-2 mt-4">
          {!readOnly && onSave && (
            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {t("common.save")}
            </Button>
          )}
          {onExportPdf && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onExportPdf(formData)}>
              <FileDown className="h-3.5 w-3.5" />
              {t("common.exportPdf")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
