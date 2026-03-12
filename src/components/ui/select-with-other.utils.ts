import { type z, ZodIssueCode } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

// ─── Zod helper ──────────────────────────────────────────────────────────────
// Use this in your makeSchema to validate the "outro" field conditionally.
//
// Example:
//   import { withOtherRefinement } from "@/components/ui/select-with-other.utils";
//   const schema = z.object({ disciplina: z.string().min(1), disciplina_outro: z.string().optional() })
//     .superRefine((val, ctx) => withOtherRefinement(val, ctx, "disciplina", "disciplina_outro", errorMsg));

export function withOtherRefinement<T extends Record<string, unknown>>(
  val: T,
  ctx: z.RefinementCtx,
  selectField: keyof T,
  otherField: keyof T,
  errorMessage: string,
  otherValue = "outros",
): void {
  if (val[selectField] === otherValue && !String(val[otherField] ?? "").trim()) {
    ctx.addIssue({
      path: [otherField as string],
      code: ZodIssueCode.custom,
      message: errorMessage,
    });
  }
}
