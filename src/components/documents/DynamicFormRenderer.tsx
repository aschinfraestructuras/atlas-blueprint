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
import { Save, Loader2 } from "lucide-react";

// ─── Schema types ─────────────────────────────────────────────────────────────

export interface FormFieldSchema {
  key: string;
  label: string;
  type: "text" | "number" | "textarea" | "checkbox" | "select" | "date";
  required?: boolean;
  placeholder?: string;
  options?: string[];   // for select
  defaultValue?: string | number | boolean;
}

export interface FormSchema {
  title?: string;
  fields: FormFieldSchema[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DynamicFormRendererProps {
  schema: FormSchema;
  data: Record<string, unknown>;
  readOnly?: boolean;
  onSave?: (data: Record<string, unknown>) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DynamicFormRenderer({ schema, data, readOnly = false, onSave }: DynamicFormRendererProps) {
  const { t } = useTranslation();
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
          {schema.title ?? t("documents.dynamicForm.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        {schema.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>

            {field.type === "text" && (
              <Input
                value={String(formData[field.key] ?? "")}
                onChange={(e) => setValue(field.key, e.target.value)}
                placeholder={field.placeholder}
                disabled={readOnly}
                className="text-sm"
              />
            )}

            {field.type === "number" && (
              <Input
                type="number"
                value={String(formData[field.key] ?? "")}
                onChange={(e) => setValue(field.key, e.target.value ? Number(e.target.value) : "")}
                placeholder={field.placeholder}
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
                placeholder={field.placeholder}
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
                <span className="text-sm text-muted-foreground">{field.placeholder}</span>
              </div>
            )}

            {field.type === "select" && (
              <Select
                value={String(formData[field.key] ?? "")}
                onValueChange={(v) => setValue(field.key, v)}
                disabled={readOnly}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={field.placeholder ?? "..."} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}

        {!readOnly && onSave && (
          <Button size="sm" className="gap-1.5 mt-4" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {t("common.save")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
