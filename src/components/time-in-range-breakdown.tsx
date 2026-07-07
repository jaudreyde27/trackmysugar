import type { GlucoseStats } from "@/lib/data/glucose-stats";

const SEGMENTS: Array<{
  key: keyof GlucoseStats;
  color: string;
  textColor: string;
  abbr: string;
  label: string;
}> = [
  {
    key: "percentVeryLow",
    color: "var(--status-critical)",
    textColor: "#ffffff",
    abbr: "VL",
    label: "Very low (<54)",
  },
  {
    key: "percentLow",
    color: "var(--status-serious)",
    textColor: "#ffffff",
    abbr: "L",
    label: "Low (54–69)",
  },
  {
    key: "percentInRange",
    color: "var(--status-good)",
    textColor: "#ffffff",
    abbr: "IR",
    label: "In range (70–180)",
  },
  {
    key: "percentHigh",
    color: "var(--status-warning)",
    textColor: "#171717",
    abbr: "H",
    label: "High (181–250)",
  },
  {
    key: "percentVeryHigh",
    color: "var(--status-critical)",
    textColor: "#ffffff",
    abbr: "VH",
    label: "Very high (>250)",
  },
];

// Five side-by-side circles, one per range bucket, each labeled with its own
// percentage — the number is the accessible source of truth (some segment
// colors don't clear contrast on their own), the abbreviation underneath
// means color is never the only way to tell buckets apart.
export function TimeInRangeBreakdown({ stats }: { stats: GlucoseStats }) {
  const hasData = stats.readingCount > 0;

  return (
    <div
      className="flex gap-2"
      role="img"
      aria-label={SEGMENTS.map((s) => `${s.label}: ${Math.round(Number(stats[s.key]))}%`).join(
        ", "
      )}
    >
      {SEGMENTS.map((seg) => (
        <div key={seg.abbr} className="flex flex-col items-center gap-1" title={seg.label}>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
              hasData ? "" : "bg-neutral-200 dark:bg-neutral-800"
            }`}
            style={
              hasData ? { backgroundColor: seg.color, color: seg.textColor } : undefined
            }
          >
            {hasData ? `${Math.round(Number(stats[seg.key]))}` : ""}
          </div>
          <span className="text-[9px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {seg.abbr}
          </span>
        </div>
      ))}
    </div>
  );
}
