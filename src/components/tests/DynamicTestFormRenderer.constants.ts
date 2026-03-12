import type { TestFormSchema, TestFormCriteria } from "@/lib/services/testTemplateService";

function evaluateCriteriaForPassFail(criteria: TestFormCriteria[], values: Record<string, unknown>): {
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

/** Compute the pass/fail result from schema + values */
export function computePassFail(schema: TestFormSchema, values: Record<string, unknown>): "pass" | "fail" | "inconclusive" {
  if (!schema.auto_pass_fail) return "inconclusive";
  const { allPass, results } = evaluateCriteriaForPassFail(schema.criteria, values);
  const evaluated = results.filter(r => r.pass !== null);
  if (evaluated.length === 0) return "inconclusive";
  return allPass ? "pass" : "fail";
}
