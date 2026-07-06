type Day = { date: string; hasData: boolean };

export function StreakCalendar({ days }: { days: Day[] }) {
  const byDate = new Map(days.map((d) => [d.date, d.hasData]));

  const cells: Array<{ key: string; hasData: boolean | null; label: string }> = [];
  const cursor = new Date();
  cursor.setUTCDate(cursor.getUTCDate() - 1);

  for (let i = 0; i < 30; i++) {
    const key = cursor.toISOString().slice(0, 10);
    cells.unshift({
      key,
      hasData: byDate.has(key) ? Boolean(byDate.get(key)) : null,
      label: cursor.toLocaleDateString([], { month: "short", day: "numeric" }),
    });
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return (
    <div>
      <div className="flex gap-1">
        {cells.map((cell) => (
          <div
            key={cell.key}
            title={`${cell.label}: ${cell.hasData === null ? "no data recorded" : cell.hasData ? "data transmitted" : "no data transmitted"}`}
            className="h-5 w-3 rounded-sm bg-neutral-200 dark:bg-neutral-800"
            style={{
              backgroundColor:
                cell.hasData === true
                  ? "var(--status-good)"
                  : cell.hasData === false
                    ? "var(--status-critical)"
                    : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-neutral-400 dark:text-neutral-500">
        <span>{cells[0]?.label}</span>
        <span>{cells[cells.length - 1]?.label}</span>
      </div>
    </div>
  );
}
