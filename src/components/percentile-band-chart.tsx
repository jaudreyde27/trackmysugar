"use client";

import { useMemo, useRef, useState } from "react";

type Reading = { systemTime: string; value: number };

type Bucket = {
  minuteOfDay: number; // bucket start, 0..1410 step 30
  count: number;
  p25: number;
  p50: number;
  p75: number;
};

const WIDTH = 720;
const HEIGHT = 240;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };
const RANGE_LOW = 70;
const RANGE_HIGH = 180;
const Y_MIN = 40;
const Y_MAX = 300;
const BUCKET_MINUTES = 30;
const BUCKET_COUNT = (24 * 60) / BUCKET_MINUTES;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const frac = index - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * frac;
}

function formatMinuteOfDay(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const min = minute % 60;
  const period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${min.toString().padStart(2, "0")} ${period}`;
}

// Ambulatory-glucose-profile-style percentile band: for each half-hour
// slot of the day, the spread of glucose values across every day in the
// window — median trend line plus a 25th-75th (IQR) shaded band.
// Computed natively from our own readings, no external aggregation
// engine involved.
export function PercentileBandChart({ readings, dayRange }: { readings: Reading[]; dayRange: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const buckets = useMemo(() => {
    if (readings.length === 0) return [];
    const latest = Math.max(...readings.map((r) => new Date(r.systemTime).getTime()));
    const cutoff = latest - dayRange * 24 * 60 * 60 * 1000;

    const byBucket = new Map<number, number[]>();
    for (const r of readings) {
      const t = new Date(r.systemTime).getTime();
      if (t < cutoff) continue;
      const d = new Date(r.systemTime);
      const minuteOfDay = d.getHours() * 60 + d.getMinutes();
      const bucketStart = Math.floor(minuteOfDay / BUCKET_MINUTES) * BUCKET_MINUTES;
      const values = byBucket.get(bucketStart);
      if (values) values.push(r.value);
      else byBucket.set(bucketStart, [r.value]);
    }

    const result: Bucket[] = [];
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const minuteOfDay = i * BUCKET_MINUTES;
      const values = byBucket.get(minuteOfDay);
      if (!values || values.length === 0) continue;
      const sorted = [...values].sort((a, b) => a - b);
      result.push({
        minuteOfDay,
        count: sorted.length,
        p25: percentile(sorted, 25),
        p50: percentile(sorted, 50),
        p75: percentile(sorted, 75),
      });
    }
    return result;
  }, [readings, dayRange]);

  if (buckets.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700">
        No glucose data in this window yet.
      </div>
    );
  }

  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;
  const xFor = (minute: number) => PADDING.left + (minute / (24 * 60)) * plotW;
  const yFor = (v: number) => PADDING.top + plotH - ((Math.min(Math.max(v, Y_MIN), Y_MAX) - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;

  const points = buckets.map((b) => ({
    ...b,
    x: xFor(b.minuteOfDay + BUCKET_MINUTES / 2),
  }));

  function areaPath(lowKey: "p25", highKey: "p75") {
    const top = points.map((p) => `${p.x.toFixed(1)},${yFor(p[highKey]).toFixed(1)}`).join(" L");
    const bottom = points
      .slice()
      .reverse()
      .map((p) => `${p.x.toFixed(1)},${yFor(p[lowKey]).toFixed(1)}`)
      .join(" L");
    return `M${top} L${bottom} Z`;
  }

  const medianPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${yFor(p.p50).toFixed(1)}`).join(" ");
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
    <div ref={containerRef} className="relative w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Glucose percentile bands by time of day">
        <rect
          x={PADDING.left}
          y={yFor(RANGE_HIGH)}
          width={plotW}
          height={yFor(RANGE_LOW) - yFor(RANGE_HIGH)}
          fill="var(--status-good)"
          opacity={0.08}
        />
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
        {[0, 6, 12, 18, 24].map((h) => (
          <text
            key={h}
            x={xFor(h * 60)}
            y={HEIGHT - PADDING.bottom + 14}
            textAnchor="middle"
            className="fill-neutral-400 text-[10px] dark:fill-neutral-500"
          >
            {h === 0 || h === 24 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
          </text>
        ))}

        <path d={areaPath("p25", "p75")} fill="#2a78d6" opacity={0.22} />
        <path d={medianPath} fill="none" stroke="#2a78d6" strokeWidth={2} strokeLinejoin="round" />

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
        {hover && <circle cx={hover.x} cy={yFor(hover.p50)} r={4} fill="#2a78d6" />}

        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={plotW}
          height={plotH}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
          style={{
            left: `${(hover.x / WIDTH) * 100}%`,
            top: 4,
            transform:
              hover.x / WIDTH > 0.75 ? "translateX(-100%)" : hover.x / WIDTH < 0.25 ? "translateX(0%)" : "translateX(-50%)",
          }}
        >
          <div className="text-neutral-500 dark:text-neutral-400">
            {formatMinuteOfDay(hover.minuteOfDay)}–{formatMinuteOfDay(hover.minuteOfDay + BUCKET_MINUTES)}
          </div>
          <div className="mt-0.5 font-medium tabular-nums">Median: {hover.p50.toFixed(0)} mg/dL</div>
          <div className="mt-0.5 text-neutral-500 tabular-nums dark:text-neutral-400">
            IQR {hover.p25.toFixed(0)}–{hover.p75.toFixed(0)}
          </div>
          <div className="mt-0.5 text-neutral-400 dark:text-neutral-500">{hover.count} readings</div>
        </div>
      )}
    </div>
  );
}
