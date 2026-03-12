/**
 * SelectWithOther
 *
 * A drop-in reusable pattern for selects that include an "Outros" option.
 * Designed to work directly inside react-hook-form <FormField> via its
 * render prop, OR standalone with explicit value/onChange props.
 *
 * Usage inside a FormField:
 * ─────────────────────────
 *   <FormField control={form.control} name="disciplina" render={({ field }) => (
 *     <SelectWithOther
 *       label={t("workItems.form.discipline")}
 *       required
 *       options={DISCIPLINE_CODES.map((c) => ({ value: c, label: t(`workItems.disciplines.${c}`) }))}
 *       otherValue={OUTROS_VALUE}          // the sentinel value that triggers the free-text input
 *       value={field.value}
 *       onChange={field.onChange}
 *       otherFieldName="disciplina_outro"  // react-hook-form field name for the free text
 *       control={form.control}
 *       otherLabel={t("workItems.form.disciplinaOutro")}
 *       otherPlaceholder={t("workItems.form.disciplinaOutroPlaceholder")}
 *     />
 *   )} />
 *
 * Persistence contract:
 *   - `value` column stores the selected option code (e.g. "outros")
 *   - `<column>_outro` stores the free-text when value === otherValue
 *   - When value !== otherValue, `<column>_outro` MUST be nulled by the caller
 */

import * as React from "react";
import { useFormContext, type Control, type FieldValues, type Path } from "react-hook-form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectWithOtherProps<T extends FieldValues> {
  /** The main select: value + onChange wired by the parent FormField */
  value: string;
  onChange: (v: string) => void;

  /** Translated option list — MUST include the sentinel (e.g. { value:"outros", label:"Outros" }) */
  options: SelectOption[];

  /** The sentinel value that shows the free-text input */
  otherValue?: string;

  /** react-hook-form field name for the "outro" free-text column (e.g. "disciplina_outro") */
  otherFieldName: Path<T>;

  /** The form control — needed to wire the inner FormField for the free-text */
  control: Control<T>;

  /** Label for the main select */
  label: string;

  /** Label for the "outro" free-text input */
  otherLabel?: string;

  /** Placeholder for the "outro" free-text input */
  otherPlaceholder?: string;

  /** Whether the select is required (shows red asterisk) */
  required?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** Extra className on the root div */
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SelectWithOther<T extends FieldValues>({
  value,
  onChange,
  options,
  otherValue = "outros",
  otherFieldName,
  control,
  label,
  otherLabel,
  otherPlaceholder,
  required,
  disabled,
  className,
}: SelectWithOtherProps<T>) {
  const isOther = value === otherValue;

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── Main Select ── */}
      <FormItem>
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </FormLabel>
        <Select onValueChange={onChange} value={value} disabled={disabled}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder={label} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>

      {/* ── Free-text input (only when sentinel is selected) ── */}
      {isOther && (
        <FormField
          control={control}
          name={otherFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {otherLabel ?? label}
                <span className="text-destructive ml-0.5">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={otherPlaceholder}
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

// withOtherRefinement and SelectOption moved to select-with-other.utils.ts
export { withOtherRefinement, type SelectOption } from "./select-with-other.utils";
