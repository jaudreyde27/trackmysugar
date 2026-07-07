"use client";

import { useMemo, useRef, useState } from "react";
import { TimeInRangeBreakdown } from "@/components/time-in-range-breakdown";
import type { GlucoseStats } from "@/lib/data/glucose-stats";

type Reading = { systemTime: string; value: number };

const WIDTH = 720;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };
const RANGE_LOW = 70;
const RANGE_HIGH = 180;
const Y_MIN = 40;
const Y_MAX = 300;

// Matches the date-range options offered by Dexcom Clarity's own trend graph.
const DAY_RANGE_OPTIONS = [7, 14, 30, 90] as const;
type DayRange = (typeof DAY_RANGE_OPTIONS)[number];
const DEFAULT_DAY_RANGE: DayRange = 14;

function RangeLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

export function GlucoseTrendChart({
  readings,
  statsByWindow,
}: {
  readings: Reading[];
  statsByWindow: Record<DayRange, GlucoseStats>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dayRange, setDayRange] = useState<DayRange>(DEFAULT_DAY_RANGE);

  const visibleReadings = useMemo(() => {
    if (readings.length === 0) return [];
    // Anchor on the latest reading rather than wall-clock time so this stays
    // a pure function of props (sync runs daily, so "latest reading" ≈ "now").
    const latest = Math.max(...readings.map((r) => new Date(r.systemTime).getTime()));
    const cutoff = latest - dayRange * 24 * 60 * 60 * 1000;
    return readings.filter((r) => new Date(r.systemTime).getTime() >= cutoff);
  }, [readings, dayRange]);

  const points = useMemo(() => {
    if (visibleReadings.length === 0) return [];
    const times = visibleReadings.map((r) => new Date(r.systemTime).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const span = Math.max(maxT - minT, 1);

    const plotW = WIDTH - PADDING.left - PADDING.right;
    const plotH = HEIGHT - PADDING.top - PADDING.bottom;

    return visibleReadings.map((r, i) => {
      const t = times[i];
      const x = PADDING.left + ((t - minT) / span) * plotW;
      const clamped = Math.min(Math.max(r.value, Y_MIN), Y_MAX);
      const y = PADDING.top + plotH - ((clamped - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;
      return { x, y, value: r.value, time: new Date(t) };
    });
  }, [visibleReadings]);

  const rangeSelector = (
    <div className="mb-2 flex items-center justify-end gap-1">
      {DAY_RANGE_OPTIONS.map((days) => (
        <button
          key={days}
          type="button"
          onClick={() => setDayRange(days)}
          className={
            days === dayRange
              ? "rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "rounded-md px-2.5 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          }
        >
          {days}D
        </button>
      ))}
    </div>
  );

  const stats = statsByWindow[dayRange];

  const statsPanel = (
    <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Avg glucose </span>
          <span className="tabular-nums text-neutral-700 dark:text-neutral-300">
            {stats.averageGlucose != null ? `${stats.averageGlucose.toFixed(0)} mg/dL` : "—"}
          </span>
        </div>
        <div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">GMI </span>
          <span className="tabular-nums text-neutral-700 dark:text-neutral-300">
            {stats.gmi != null ? `${stats.gmi.toFixed(1)}%` : "—"}
          </span>
        </div>
      </div>
      <div className="mt-3">
        <TimeInRangeBreakdown stats={stats} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-neutral-500 dark:text-neutral-400 sm:grid-cols-5">
        <RangeLegend color="var(--status-critical)" label="Very low <54" />
        <RangeLegend color="var(--status-serious)" label="Low 54–69" />
        <RangeLegend color="var(--status-good)" label="In range 70–180" />
        <RangeLegend color="var(--status-warning)" label="High 181–250" />
        <RangeLegend color="var(--status-critical)" label="Very high >250" />
      </div>
    </div>
  );

  if (points.length === 0) {
    return (
      <div>
        {rangeSelector}
        <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700">
          No glucose data in this window yet.
        </div>
        {statsPanel}
      </div>
    );
  }

  const plotH = HEIGHT - PADDING.top - PADDING.bottom;
  const yFor = (v: number) => PADDING.top + plotH - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const hover = hoverIndex != null ? points[hoverIndex] : null;

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = WIDTH / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;

    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - localX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  return (
    <div>
      {rangeSelector}
      <div ref={containerRef} className="relative w-full">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label="Glucose trend over time"
        >
          {/* Target range band */}
          <rect
            x={PADDING.left}
            y={yFor(RANGE_HIGH)}
            width={WIDTH - PADDING.left - PADDING.right}
            height={yFor(RANGE_LOW) - yFor(RANGE_HIGH)}
            fill="var(--status-good)"
            opacity={0.08}
          />
          {/* Gridlines */}
          {[70, 180, 250].map((v) => (
            <g key={v}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={yFor(v)}
                y2={yFor(v)}
                stroke="currentColor"
                className="text-neutral-200 dark:text-neutral-800"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={yFor(v)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-neutral-400 text-[10px] dark:fill-neutral-500"
              >
                {v}
              </text>
            </g>
          ))}

          <path d={path} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinejoin="round" />

          {hover && (
            <line
              x1={hover.x}
              x2={hover.x}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
              stroke="currentColor"
              className="text-neutral-400 dark:text-neutral-600"
              strokeWidth={1}
            />
          )}
          {hover && <circle cx={hover.x} cy={hover.y} r={4} fill="#2a78d6" />}

          <rect
            x={PADDING.left}
            y={PADDING.top}
            width={WIDTH - PADDING.left - PADDING.right}
            height={plotH}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIndex(null)}
          />
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
            style={{
              left: `${(hover.x / WIDTH) * 100}%`,
              top: 4,
              transform: "translateX(-50%)",
            }}
          >
            <div className="font-medium tabular-nums">{hover.value} mg/dL</div>
            <div className="text-neutral-500 dark:text-neutral-400">
              {hover.time.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          </div>
        )}
      </div>
      {statsPanel}
    </div>
  );
}
