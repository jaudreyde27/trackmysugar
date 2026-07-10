import type { GlucoseStats } from "@/lib/data/glucose-stats";

// Colors informed by a standard AGP-style time-in-range chart: warm ambers
// for above-range, green for in-range, coral fading to deep maroon for
// below-range — distinct from the app's status-alert palette used
// elsewhere, since this chart is describing a distribution, not a warning.
const SEGMENTS: Array<{ key: keyof GlucoseStats; color: string; abbr: string; label: string }> = [
  { key: "percentVeryLow", color: "#a12f24", abbr: "VL", label: "Very low (<54)" },
  { key: "percentLow", color: "#e8836f", abbr: "L", label: "Low (54–69)" },
  { key: "percentInRange", color: "#4caf50", abbr: "IR", label: "In range (70–180)" },
  { key: "percentHigh", color: "#f2b04a", abbr: "H", label: "High (181–250)" },
  { key: "percentVeryHigh", color: "#d97b1f", abbr: "VH", label: "Very high (>250)" },
];

// Compact horizontal stacked bar — replaces the five time-in-range circles
// on the practice-overview roster. The overall in-range percentage is
// called out in bold text next to the bar (the single most important
// number); each segment's own percentage is printed below the bar, in the
// same left-to-right order and colored to match, so all 5 values are
// visible at a glance rather than needing a hover.
export function TimeInRangeBar({ stats, size = "md" }: { stats: GlucoseStats; size?: "sm" | "md" }) {
  const hasData = stats.readingCount > 0;
  const height = size === "sm" ? "h-3.5" : "h-4";
  const width = size === "sm" ? "w-32" : "w-40";

  return (
    <div
      className="flex flex-col gap-1"
      role="img"
      aria-label={SEGMENTS.map((s) => `${s.label}: ${Math.round(Number(stats[s.key]))}%`).join(", ")}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex ${height} ${width} shrink-0 overflow-hidden rounded-sm ${
            hasData ? "" : "bg-neutral-200 dark:bg-neutral-800"
          }`}
        >
          {hasData &&
            SEGMENTS.map((seg) => {
              const pct = Number(stats[seg.key]);
              if (pct <= 0) return null;
              return (
                <div
                  key={seg.abbr}
                  title={`${seg.label}: ${Math.round(pct)}%`}
                  style={{ width: `${pct}%`, backgroundColor: seg.color }}
                />
              );
            })}
        </div>
        <span className="text-xs font-semibold tabular-nums text-neutral-700 dark:text-neutral-300">
          {hasData ? `${Math.round(stats.percentInRange)}%` : "—"}
        </span>
      </div>
      {hasData && (
        <div className={`flex ${width} justify-between`}>
          {SEGMENTS.map((seg) => (
            <span
              key={seg.abbr}
              title={seg.label}
              className="text-[9px] font-medium tabular-nums"
              style={{ color: seg.color }}
            >
              {Math.round(Number(stats[seg.key]))}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
