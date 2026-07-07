import { R30_WINDOW_DAYS } from "@/lib/constants";
import { r30Color } from "@/components/r30-badge";

export function DaysTransmittedCounter({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-baseline gap-1"
      title={`${count} of the last ${R30_WINDOW_DAYS} days had data transmitted`}
    >
      <span className="text-lg font-semibold tabular-nums" style={{ color: r30Color(count) }}>
        {count}
      </span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        /{R30_WINDOW_DAYS} days transmitted
      </span>
    </span>
  );
}
