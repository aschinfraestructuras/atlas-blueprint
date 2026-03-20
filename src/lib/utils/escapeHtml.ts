/**
 * Escape HTML special characters to prevent XSS when injecting
 * user-provided values into HTML template strings.
 */
export function escapeHtml(value: unknown): string {
  const s = value == null ? "" : String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape a value for use in HTML, returning "—" for empty/null values.
 */
export function esc(value: unknown): string {
  if (value == null || value === "") return "—";
  return escapeHtml(value);
}
