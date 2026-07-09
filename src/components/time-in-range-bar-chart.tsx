type TirStats = {
  readingCount: number;
  percentVeryLow: number;
  percentLow: number;
  percentInRange: number;
  percentHigh: number;
  percentVeryHigh: number;
};

const SEGMENTS: Array<{ key: keyof TirStats; abbr: string; label: string; color: string }> = [
  { key: "percentVeryLow", abbr: "VL", label: "Very low (<54)", color: "var(--status-critical)" },
  { key: "percentLow", abbr: "L", label: "Low (54–69)", color: "var(--status-serious)" },
  { key: "percentInRange", abbr: "IR", label: "In range (70–180)", color: "var(--status-good)" },
  { key: "percentHigh", abbr: "H", label: "High (181–250)", color: "var(--status-warning)" },
  { key: "percentVeryHigh", abbr: "VH", label: "Very high (>250)", color: "var(--status-critical)" },
];

const BAR_AREA_HEIGHT = 96;

// Same 5 buckets as TimeInRangeBar, drawn as a vertical bar chart — used on
// the Trends tab, toggled by the same day-range control as the percentile
// chart above it.
export function TimeInRangeBarChart({ stats }: { stats: TirStats }) {
  const hasData = stats.readingCount > 0;

  return (
    <div
      role="img"
      aria-label={SEGMENTS.map((s) => `${s.label}: ${Math.round(stats[s.key])}%`).join(", ")}
    >
      <div className="flex items-end justify-between gap-3" style={{ height: BAR_AREA_HEIGHT + 24 }}>
        {SEGMENTS.map((seg) => {
          const pct = hasData ? stats[seg.key] : 0;
          const barHeight = pct > 0 ? Math.max((pct / 100) * BAR_AREA_HEIGHT, 3) : 0;
          return (
            <div key={seg.abbr} className="flex flex-1 flex-col items-center justify-end gap-1" title={seg.label}>
              <span className="text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">
                {hasData ? `${Math.round(pct)}%` : "—"}
              </span>
              <div
                className={`w-full max-w-[36px] rounded-t-sm transition-[height] ${
                  hasData ? "" : "bg-neutral-100 dark:bg-neutral-900"
                }`}
                style={{ height: barHeight, backgroundColor: hasData ? seg.color : undefined }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        {SEGMENTS.map((seg) => (
          <div
            key={seg.abbr}
            className="flex-1 text-center text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
          >
            {seg.abbr}
          </div>
        ))}
      </div>
    </div>
  );
}
