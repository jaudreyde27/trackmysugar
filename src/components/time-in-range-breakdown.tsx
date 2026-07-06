import type { GlucoseStats } from "@/lib/data/glucose-stats";
import { TimeInRangeBar } from "@/components/time-in-range-bar";

const SEGMENTS: Array<{ key: keyof GlucoseStats; color: string; abbr: string; label: string }> = [
  { key: "percentVeryLow", color: "var(--status-critical)", abbr: "VL", label: "Very low (<54)" },
  { key: "percentLow", color: "var(--status-serious)", abbr: "L", label: "Low (54–69)" },
  { key: "percentInRange", color: "var(--status-good)", abbr: "IR", label: "In range (70–180)" },
  { key: "percentHigh", color: "var(--status-warning)", abbr: "H", label: "High (181–250)" },
  { key: "percentVeryHigh", color: "var(--status-critical)", abbr: "VH", label: "Very high (>250)" },
];

// Stacked bar (quick visual scan) plus the explicit per-range percentages —
// some segment colors don't clear contrast on their own, so the numbers are
// the accessible source of truth, not just the color.
export function TimeInRangeBreakdown({ stats }: { stats: GlucoseStats }) {
  return (
    <div className="w-full">
      <TimeInRangeBar stats={stats} />
      {stats.readingCount > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
          {SEGMENTS.map((seg) => (
            <span
              key={seg.abbr}
              className="inline-flex items-center gap-1 text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400"
              title={seg.label}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: seg.color }}
                aria-hidden
              />
              {seg.abbr} {Number(stats[seg.key]).toFixed(0)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
