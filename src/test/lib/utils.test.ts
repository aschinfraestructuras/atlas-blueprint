import { describe, it, expect, vi } from "vitest";
import { cn } from "@/lib/utils";
import { displayOtherValue } from "@/lib/utils/displayOther";
import { classifySupabaseError, type SupabaseErrorInfo } from "@/lib/utils/supabaseError";

// ─── cn() ────────────────────────────────────────────────────────────────────

describe("cn()", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional classes", () => {
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe("text-sm font-bold");
  });

  it("returns empty string for no input", () => {
    expect(cn()).toBe("");
  });

  it("deduplicates conflicting classes", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

// ─── displayOtherValue() ─────────────────────────────────────────────────────

describe("displayOtherValue()", () => {
  it("returns custom value when main is 'outros' and outro is set", () => {
    expect(displayOtherValue("outros", "Custom Value", "Fallback")).toBe("Custom Value");
  });

  it("returns custom value when main is 'outro'", () => {
    expect(displayOtherValue("outro", "My Custom", "Fallback")).toBe("My Custom");
  });

  it("returns fallback when main is not 'outros'/'outro'", () => {
    expect(displayOtherValue("concrete", null, "Betão")).toBe("Betão");
  });

  it("returns fallback when main is 'outros' but outro is empty", () => {
    expect(displayOtherValue("outros", null, "Fallback")).toBe("Fallback");
    expect(displayOtherValue("outros", undefined, "Fallback")).toBe("Fallback");
  });

  it("returns fallback when main is null/undefined", () => {
    expect(displayOtherValue(null, "Something", "Fallback")).toBe("Fallback");
    expect(displayOtherValue(undefined, "Something", "Fallback")).toBe("Fallback");
  });
});

// ─── classifySupabaseError() ─────────────────────────────────────────────────

describe("classifySupabaseError()", () => {
  // Suppress console.error in tests
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  it("classifies RLS / permission errors by code", () => {
    const err = { code: "42501", message: "permission denied for table" };
    const info: SupabaseErrorInfo = classifySupabaseError(err);
    expect(info.titleKey).toBe("errors.rls.title");
    expect(info.descriptionKey).toBe("errors.rls.description");
  });

  it("classifies RLS errors by message content", () => {
    const err = new Error("new row violates row-level security policy");
    const info = classifySupabaseError(err);
    expect(info.titleKey).toBe("errors.rls.title");
  });

  it("classifies unique constraint errors", () => {
    const err = { code: "23505", message: "duplicate key value violates unique constraint" };
    const info = classifySupabaseError(err);
    expect(info.titleKey).toBe("errors.unique.title");
  });

  it("classifies not-null constraint errors", () => {
    const err = { code: "23502", message: "null value in column violates not-null constraint" };
    const info = classifySupabaseError(err);
    expect(info.titleKey).toBe("errors.notNull.title");
  });

  it("classifies foreign key constraint errors", () => {
    const err = { code: "23503", message: "violates foreign key constraint" };
    const info = classifySupabaseError(err);
    expect(info.titleKey).toBe("errors.fk.title");
  });

  it("falls back to generic for unknown errors", () => {
    const err = new Error("something unexpected");
    const info = classifySupabaseError(err);
    expect(info.titleKey).toBe("errors.generic.title");
    expect(info.descriptionKey).toBeNull();
    expect(info.raw).toBe("something unexpected");
  });

  it("uses t() function when provided", () => {
    const mockT = (key: string) => `translated:${key}`;
    const err = { code: "23505", message: "unique violation" };
    const info = classifySupabaseError(err, mockT);
    expect(info.title).toBe("translated:errors.unique.title");
    expect(info.description).toBe("translated:errors.unique.description");
  });

  it("handles non-object errors", () => {
    const info = classifySupabaseError("string error");
    expect(info.titleKey).toBe("errors.generic.title");
    expect(info.raw).toBe("string error");
  });

  it("extracts message from PostgrestError-like objects", () => {
    const err = { message: "", details: "detailed info", hint: "" };
    const info = classifySupabaseError(err);
    expect(info.raw).toBe("detailed info");
  });

  afterAll(() => consoleSpy.mockRestore());
});
