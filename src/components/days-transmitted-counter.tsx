import { R30_WINDOW_DAYS } from "@/lib/sync/streak";
import { r30Color } from "@/components/r30-badge";

export function DaysTransmittedCounter({ count }: { count: number }) {
  return (
    <div
      title={`${count} of the last ${R30_WINDOW_DAYS} days had data transmitted`}
    >
      <div
        className="flex items-baseline gap-1 text-3xl font-semibold tabular-nums"
        style={{ color: r30Color(count) }}
      >
        {count}
        <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">
          /{R30_WINDOW_DAYS}
        </span>
      </div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        days transmitted (last {R30_WINDOW_DAYS})
      </div>
    </div>
  );
}
