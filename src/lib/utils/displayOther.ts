/**
 * When a select field has value "outros" and there's a custom _outro value,
 * display the custom value instead of the generic "Outros" label.
 */
export function displayOtherValue(
  main: string | null | undefined,
  outro: string | null | undefined,
  fallbackLabel: string,
): string {
  if ((main === "outros" || main === "outro") && outro) return outro;
  return fallbackLabel;
}
