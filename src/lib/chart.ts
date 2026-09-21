/**
 * Axis scale for a bar chart: a clean maximum and tick values (0, 5,000,
 * 10,000...) instead of an awkward top like 34,720.
 */
export interface Scale {
  max: number;
  ticks: number[];
}

const STEPS = [1, 2, 2.5, 5, 10];

export function niceScale(dataMax: number, tickCount = 4): Scale {
  if (!(dataMax > 0)) return { max: 1, ticks: [0, 1] };

  // Smallest "clean" step (1, 2, 2.5, 5 x 10^n) that covers the data in about `tickCount` steps.
  const rough = dataMax / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = (STEPS.find((s) => s * magnitude >= rough) ?? 10) * magnitude;

  const max = Math.ceil(dataMax / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(Math.round(value * 100) / 100);
  return { max, ticks };
}
