/**
 * Numeric WBS sort: "1, 2, 3, 10, 11" instead of "1, 10, 11, 2, 3"
 */
export function compareWbsCodes(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
