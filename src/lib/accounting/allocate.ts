/**
 * Split a whole-rupee total across weights so the parts always add up to
 * exactly `total` (largest-remainder method). Used for deal prices and
 * partner profit shares.
 */
export function allocate(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  if (weights.length === 0) return [];
  if (weightSum <= 0) throw new Error("allocate: weights must add up to more than 0");

  const exact = weights.map((w) => (total * w) / weightSum);
  const parts = exact.map(Math.floor);
  let leftover = total - parts.reduce((sum, p) => sum + p, 0);

  // Give the leftover rupees to the parts with the biggest fractions.
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of order) {
    if (leftover <= 0) break;
    parts[index] += 1;
    leftover -= 1;
  }
  return parts;
}
