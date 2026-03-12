import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Calculator } from "lucide-react";
import type { TestFormSchema, TestFormField, TestFormCriteria } from "@/lib/services/testTemplateService";

interface DynamicTestFormRendererProps {
  schema: TestFormSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  readOnly?: boolean;
}

// ─── Simple expression evaluator ──────────────────────────────────────────────
function evaluateExpression(expr: string, values: Record<string, unknown>): number | null {
  try {
    // Replace field references with values
    let resolved = expr;
    const fieldRefs = expr.match(/[a-z_][a-z0-9_]*/gi) ?? [];
    for (const ref of fieldRefs) {
      const val = values[ref];
      if (val === undefined || val === null || val === "") return null;
      resolved = resolved.replace(new RegExp(`\\b${ref}\\b`, "g"), String(Number(val)));
    }
    // Only allow safe math: digits, operators, parens, dots
    if (!/^[\d\s+\-*/().]+$/.test(resolved)) return null;
    // eslint-disable-next-line no-eval
    const result = Function(`"use strict"; return (${resolved})`)();
    return typeof result === "number" && isFinite(result) ? Math.round(result * 100) / 100 : null;
  } catch {
    return null;
  }
}

function evaluateCriteria(criteria: TestFormCriteria[], values: Record<string, unknown>): {
  allPass: boolean; results: { criteria: TestFormCriteria; pass: boolean | null }[];
} {
  const results = criteria.map((c) => {
    const val = values[c.field];
    if (val === undefined || val === null || val === "") return { criteria: c, pass: null };
    const num = Number(val);
    if (isNaN(num)) return { criteria: c, pass: null };

    let pass: boolean;
    switch (c.operator) {
      case ">=": pass = num >= c.value; break;
      case "<=": pass = num <= c.value; break;
      case ">": pass = num > c.value; break;
      case "<": pass = num < c.value; break;
      case "==": pass = num === c.value; break;
      case "range": pass = num >= c.value && num <= (c.value_max ?? Infinity); break;
      default: pass = false;
    }
    return { criteria: c, pass };
  });

  const evaluated = results.filter(r => r.pass !== null);
  const allPass = evaluated.length > 0 && evaluated.every(r => r.pass === true);
  return { allPass, results };
}

export function DynamicTestFormRenderer({ schema, values, onChange, readOnly }: DynamicTestFormRendererProps) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language.startsWith("es") ? "es" : "pt";

  // Compute derived fields whenever values change
  const computedValues = useMemo(() => {
    const updated = { ...values };
    for (const field of schema.fields) {
      if (field.computed) {
        const result = evaluateExpression(field.computed, updated);
        if (result !== null) updated[field.key] = result;
      }
    }
    return updated;
  }, [values, schema.fields]);

  // Auto-sync computed values back
  useEffect(() => {
    let changed = false;
    const next = { ...values };
    for (const field of schema.fields) {
      if (field.computed) {
        const result = evaluateExpression(field.computed, next);
        if (result !== null && next[field.key] !== result) {
          next[field.key] = result;
          changed = true;
        }
      }
    }
    if (changed) onChange(next);
  }, [values, schema.fields, onChange]);

  // Criteria evaluation
  const criteriaResult = useMemo(() => evaluateCriteria(schema.criteria, computedValues), [schema.criteria, computedValues]);

  const handleFieldChange = (key: string, val: unknown) => {
    onChange({ ...values, [key]: val });
  };

  const getLabel = (f: TestFormField) => lang === "es" ? f.label_es : f.label_pt;
  const getCriteriaLabel = (c: TestFormCriteria) => lang === "es" ? c.label_es : c.label_pt;

  return (
    <div className="space-y-5">
      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {schema.fields.map((field) => {
          const isComputed = !!field.computed;
          const fieldVal = computedValues[field.key] ?? "";

          return (
            <div key={field.key} className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                {getLabel(field)}
                {field.unit && <span className="text-muted-foreground">({field.unit})</span>}
                {field.required && <span className="text-destructive">*</span>}
                {isComputed && <Calculator className="h-3 w-3 text-muted-foreground" />}
              </Label>

              {field.type === "select" ? (
                <Select
                  value={String(fieldVal)}
                  onValueChange={(v) => handleFieldChange(field.key, v)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map(o => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "boolean" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={!!fieldVal}
                    onCheckedChange={(c) => handleFieldChange(field.key, !!c)}
                    disabled={readOnly}
                  />
                  <span className="text-sm text-muted-foreground">{getLabel(field)}</span>
                </div>
              ) : (
                <Input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={String(fieldVal)}
                  onChange={(e) => handleFieldChange(field.key, field.type === "number" ? e.target.value : e.target.value)}
                  disabled={readOnly || isComputed}
                  className={cn("h-8 text-sm", isComputed && "bg-muted/40 font-semibold")}
                  min={field.min} max={field.max}
                  step={field.type === "number" ? "any" : undefined}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Criteria Results */}
      {schema.criteria.length > 0 && (
        <div className="border border-border rounded-lg p-3 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("tests.templates.criteria")}
          </h4>
          <div className="space-y-1.5">
            {criteriaResult.results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {r.pass === null ? (
                  <div className="h-4 w-4 rounded-full bg-muted" />
                ) : r.pass ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className={cn(
                  r.pass === null ? "text-muted-foreground" : r.pass ? "text-foreground" : "text-destructive"
                )}>
                  {getCriteriaLabel(r.criteria)}
                </span>
                {r.pass !== null && (
                  <Badge variant="secondary" className={cn("text-[10px] ml-auto",
                    r.pass ? "bg-primary/15 text-primary" : "bg-destructive/10 text-destructive"
                  )}>
                    {r.pass ? t("tests.templates.criteriaPass") : t("tests.templates.criteriaFail")}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Overall verdict */}
          {schema.auto_pass_fail && criteriaResult.results.some(r => r.pass !== null) && (
            <div className={cn(
              "mt-2 p-2 rounded-md text-center text-sm font-semibold",
              criteriaResult.allPass
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            )}>
              {criteriaResult.allPass
                ? `✅ ${t("tests.templates.criteriaPass")}`
                : `❌ ${t("tests.templates.criteriaFail")}`
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// computePassFail moved to DynamicTestFormRenderer.constants.ts
export { computePassFail } from "./DynamicTestFormRenderer.constants";
