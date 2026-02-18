/**
 * Classifies a Supabase/PostgreSQL error and returns i18n keys + optionally resolved strings.
 */
export interface SupabaseErrorInfo {
  titleKey: string;
  descriptionKey: string | null;
  raw: string;
  title: string;
  description: string | undefined;
}

function buildInfo(
  titleKey: string,
  descriptionKey: string | null,
  raw: string,
  t?: (key: string) => string
): SupabaseErrorInfo {
  return {
    titleKey,
    descriptionKey,
    raw,
    title: t ? t(titleKey) : titleKey,
    description: descriptionKey && t ? t(descriptionKey) : undefined,
  };
}

export function classifySupabaseError(
  err: unknown,
  t?: (key: string) => string
): SupabaseErrorInfo {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    console.error("[Supabase Error]", {
      code: e.code,
      message: e.message,
      details: e.details,
      hint: e.hint,
    });
  } else {
    console.error("[Supabase Error]", err);
  }

  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null
      ? String((err as Record<string, unknown>).message ?? "")
      : String(err);

  const code =
    typeof err === "object" && err !== null
      ? String((err as Record<string, unknown>).code ?? "")
      : "";

  // RLS / permission errors
  if (
    code === "42501" ||
    message.toLowerCase().includes("row-level security") ||
    message.toLowerCase().includes("permission denied") ||
    message.toLowerCase().includes("new row violates")
  ) {
    return buildInfo("errors.rls.title", "errors.rls.description", message, t);
  }

  // Unique constraint violation
  if (code === "23505" || message.toLowerCase().includes("unique")) {
    return buildInfo("errors.unique.title", "errors.unique.description", message, t);
  }

  // Not-null constraint
  if (code === "23502" || message.toLowerCase().includes("not-null")) {
    return buildInfo("errors.notNull.title", "errors.notNull.description", message, t);
  }

  // Foreign key constraint
  if (code === "23503" || message.toLowerCase().includes("foreign key")) {
    return buildInfo("errors.fk.title", "errors.fk.description", message, t);
  }

  // Generic fallback
  return buildInfo("errors.generic.title", null, message, t);
}
