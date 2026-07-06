"use client";

import { useMemo, useRef, useState } from "react";

type Reading = { systemTime: string; value: number };

const WIDTH = 720;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };
const RANGE_LOW = 70;
const RANGE_HIGH = 180;
const Y_MIN = 40;
const Y_MAX = 300;

export function GlucoseTrendChart({ readings }: { readings: Reading[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    if (readings.length === 0) return [];
    const times = readings.map((r) => new Date(r.systemTime).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const span = Math.max(maxT - minT, 1);

    const plotW = WIDTH - PADDING.left - PADDING.right;
    const plotH = HEIGHT - PADDING.top - PADDING.bottom;

    return readings.map((r, i) => {
      const t = times[i];
      const x = PADDING.left + ((t - minT) / span) * plotW;
      const clamped = Math.min(Math.max(r.value, Y_MIN), Y_MAX);
      const y = PADDING.top + plotH - ((clamped - Y_MIN) / (Y_MAX - Y_MIN)) * plotH;
      return { x, y, value: r.value, time: new Date(t) };
    });
  }, [readings]);

  if (points.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-500 dark:border-neutral-700">
        No glucose data in this window yet.
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
  );
}
