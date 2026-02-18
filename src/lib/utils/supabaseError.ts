/**
 * Classifies a Supabase/PostgreSQL error and returns an i18n key for the toast.
 * Falls back to a generic key if the error is unknown.
 */
export interface SupabaseErrorInfo {
  titleKey: string;
  descriptionKey: string | null;
  /** Raw technical message for console logging */
  raw: string;
}

export function classifySupabaseError(err: unknown): SupabaseErrorInfo {
  // Log full error details for debugging
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
    return {
      titleKey: "errors.rls.title",
      descriptionKey: "errors.rls.description",
      raw: message,
    };
  }

  // Unique constraint violation
  if (code === "23505" || message.toLowerCase().includes("unique")) {
    return {
      titleKey: "errors.unique.title",
      descriptionKey: "errors.unique.description",
      raw: message,
    };
  }

  // Not-null constraint
  if (code === "23502" || message.toLowerCase().includes("not-null")) {
    return {
      titleKey: "errors.notNull.title",
      descriptionKey: "errors.notNull.description",
      raw: message,
    };
  }

  // Foreign key constraint
  if (code === "23503" || message.toLowerCase().includes("foreign key")) {
    return {
      titleKey: "errors.fk.title",
      descriptionKey: "errors.fk.description",
      raw: message,
    };
  }

  // Generic fallback
  return {
    titleKey: "errors.generic.title",
    descriptionKey: null,
    raw: message,
  };
}
