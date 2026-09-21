"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { niceScale } from "@/lib/chart";
import { num, rs } from "@/lib/format";
import type { ChartDay } from "../queries";

// Geometry in real pixels: the chart is drawn at the card's actual width, so
// text stays a readable size on a phone and on a wide screen alike.
const HEIGHT = 220;
const LEFT = 44;
const RIGHT = 8;
const TOP = 22;
const BOTTOM = 28;
const MAX_BAR = 24;
const RADIUS = 4;
const MIN_WIDTH = 260;
const DEFAULT_WIDTH = 560;

const compact = (value: number) => (value >= 1000 ? `${value / 1000}k` : String(value));

/** A column with a 4px rounded top and a square base, growing from the baseline. */
function barPath(x: number, width: number, top: number, base: number): string {
  const r = Math.min(RADIUS, width / 2, base - top);
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${base} Z`;
}

/**
 * Sales per day. One series, so no legend: the title says what it is. Today is
 * the accent colour and the other days are a quiet neutral (an emphasis chart).
 * Every value is also in the tooltip and in the table view.
 */
export function SalesChart({ days }: { days: ChartDay[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(MIN_WIDTH, Math.floor(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, [asTable]);

  const scale = niceScale(Math.max(...days.map((d) => d.sale), 0));
  const plotW = width - LEFT - RIGHT;
  const plotH = HEIGHT - TOP - BOTTOM;
  const slot = plotW / Math.max(days.length, 1);
  const barW = Math.min(MAX_BAR, slot * 0.6);
  const yOf = (value: number) => TOP + plotH - (value / scale.max) * plotH;
  const base = TOP + plotH;
  const hasSales = days.some((d) => d.sale > 0);

  return (
    <div className="min-w-0 rounded-[14px] border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Sales, last 7 days</h2>
        <Button variant="ghost" size="sm" onClick={() => setAsTable((value) => !value)}>
          {asTable ? "View as chart" : "View as table"}
        </Button>
      </div>

      {asTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#fafbfc] text-left text-[12.5px] text-muted-foreground">
              <th className="px-[18px] py-2 font-medium">Day</th>
              <th className="px-[18px] py-2 text-right font-medium">Sales</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.businessDate} className="border-b last:border-b-0">
                <td className="px-[18px] py-2.5">{day.label}</td>
                <td className="px-[18px] py-2.5 text-right tabular-nums">{rs(day.sale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-[18px] py-3.5">
          {/* The svg is absolutely placed so its own width never stretches this box: the box is
              sized by the card, we measure it, and the chart is drawn to that width. */}
          <div ref={holder} className="relative w-full" style={{ height: HEIGHT }}>
            <svg width={width} height={HEIGHT} role="group" aria-label="Sales for the last 7 days" className="absolute top-0 left-0">
              {scale.ticks.map((tick) => (
                <g key={tick}>
                  <line x1={LEFT} x2={width - RIGHT} y1={yOf(tick)} y2={yOf(tick)} style={{ stroke: "var(--border)" }} strokeWidth={1} />
                  <text x={LEFT - 8} y={yOf(tick) + 4} textAnchor="end" fontSize={11} style={{ fill: "var(--muted-foreground)" }}>
                    {compact(tick)}
                  </text>
                </g>
              ))}

              {days.map((day, index) => {
                const x = LEFT + index * slot + (slot - barW) / 2;
                const top = yOf(day.sale);
                const hovered = active === index;
                return (
                  <g key={day.businessDate}>
                    {day.sale > 0 ? (
                      <path
                        d={barPath(x, barW, top, base)}
                        style={{ fill: day.isToday ? "var(--brass)" : "var(--chart-neutral)", opacity: active === null || hovered ? 1 : 0.7 }}
                      />
                    ) : null}
                    {day.isToday && day.sale > 0 ? (
                      <text x={x + barW / 2} y={top - 6} textAnchor="middle" fontSize={12} fontWeight={500} style={{ fill: "var(--foreground)" }}>
                        {num(day.sale)}
                      </text>
                    ) : null}
                    <text x={x + barW / 2} y={HEIGHT - 8} textAnchor="middle" fontSize={11.5} style={{ fill: "var(--muted-foreground)" }}>
                      {day.label}
                    </text>
                    {/* The hit area is the whole slot, much bigger than the bar. */}
                    <rect
                      x={LEFT + index * slot}
                      y={TOP}
                      width={slot}
                      height={plotH + BOTTOM}
                      fill="transparent"
                      tabIndex={0}
                      role="img"
                      aria-label={`${day.label}: ${rs(day.sale)}`}
                      className="cursor-default outline-none focus-visible:stroke-[var(--ring)]"
                      onPointerEnter={() => setActive(index)}
                      onPointerLeave={() => setActive(null)}
                      onFocus={() => setActive(index)}
                      onBlur={() => setActive(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {active !== null ? (
              <div
                className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 shadow-md"
                style={{ left: Math.min(Math.max(LEFT + (active + 0.5) * slot, 56), width - 56) }}
              >
                <p className="text-[12.5px] text-muted-foreground">{days[active].label}</p>
                <p className="flex items-center gap-2 text-[15px] font-semibold tabular-nums">
                  <span
                    aria-hidden
                    className="inline-block h-0.5 w-3.5 rounded"
                    style={{ background: days[active].isToday ? "var(--brass)" : "var(--chart-neutral)" }}
                  />
                  {rs(days[active].sale)}
                </p>
              </div>
            ) : null}

            {!hasSales ? (
              <p className="absolute inset-x-0 top-1/2 text-center text-[13px] text-muted-foreground">No sales yet</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
