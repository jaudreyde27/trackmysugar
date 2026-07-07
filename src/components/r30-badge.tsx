import { R30_WINDOW_DAYS } from "@/lib/sync/streak";

// 16-of-30-day threshold mirrors the common CGM remote-monitoring billing
// requirement (e.g. CPT 99454) — not a hard rule, just a reasonable default
// for flagging patients whose data is too sparse to review confidently.
export const R30_ADEQUATE_THRESHOLD = 16;

export function r30Color(count: number): string {
  if (count >= R30_ADEQUATE_THRESHOLD) return "var(--status-good)";
  if (count > 0) return "var(--status-warning)";
  return "var(--status-critical)";
}

export function R30Badge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-baseline gap-0.5 font-semibold tabular-nums"
      style={{ color: r30Color(count) }}
      title={`${count} of the last ${R30_WINDOW_DAYS} days had data transmitted`}
    >
      {count}
      <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
        /{R30_WINDOW_DAYS}
      </span>
    </span>
  );
}
