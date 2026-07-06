import type { GlucoseStats } from "@/lib/data/glucose-stats";

const SEGMENTS: Array<{ key: keyof GlucoseStats; color: string; label: string }> = [
  { key: "percentVeryLow", color: "var(--status-critical)", label: "Very low (<54)" },
  { key: "percentLow", color: "var(--status-serious)", label: "Low (54–69)" },
  { key: "percentInRange", color: "var(--status-good)", label: "In range (70–180)" },
  { key: "percentHigh", color: "var(--status-warning)", label: "High (181–250)" },
  { key: "percentVeryHigh", color: "var(--status-critical)", label: "Very high (>250)" },
];

export function TimeInRangeBar({ stats }: { stats: GlucoseStats }) {
  if (stats.readingCount === 0) {
    return (
      <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800" title="No data" />
    );
  }

  return (
    <div
      className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
      role="img"
      aria-label={SEGMENTS.map((s) => `${s.label}: ${Math.round(Number(stats[s.key]))}%`).join(
        ", "
      )}
    >
      {SEGMENTS.map((seg, i) => {
        const value = Number(stats[seg.key]);
        if (value <= 0) return null;
        return (
          <div
            key={i}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ flexBasis: `${value}%`, backgroundColor: seg.color }}
            title={`${seg.label}: ${value.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}
