function streakColor(streak: number): string {
  if (streak === 0) return "var(--status-critical)";
  if (streak < 3) return "var(--status-warning)";
  return "var(--status-good)";
}

export function StreakTicker({ streak, size = "md" }: { streak: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <span
      className={`inline-flex items-baseline gap-1 font-semibold tabular-nums ${sizeClasses}`}
      style={{ color: streakColor(streak) }}
      title={`${streak} consecutive day${streak === 1 ? "" : "s"} with data transmitted`}
    >
      {streak}
      <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">
        day{streak === 1 ? "" : "s"}
      </span>
    </span>
  );
}
