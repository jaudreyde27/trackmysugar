"use client";

import { useRouter } from "next/navigation";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function BillingPeriodSelector({
  year,
  month,
  yearOptions,
}: {
  year: number;
  month: number;
  yearOptions: number[];
}) {
  const router = useRouter();

  function navigate(nextYear: number, nextMonth: number) {
    router.push(`/billing?year=${nextYear}&month=${nextMonth}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => navigate(year, Number(e.target.value))}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => navigate(Number(e.target.value), month)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
