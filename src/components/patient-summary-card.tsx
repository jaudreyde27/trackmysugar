import type { ComplianceMonth } from "@/lib/data/billing";

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatMinutes(minutes: number): string {
  const total = Math.round(minutes * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-neutral-800 dark:text-neutral-200">{value ?? "—"}</div>
    </div>
  );
}

export function PatientSummaryCard({
  firstName,
  lastName,
  sex,
  dateOfBirth,
  monitoringMinutesThisMonth,
  consentDate,
  primaryProviderName,
  careManagerName,
  lastCdcesTouchpointAt,
  complianceHistory,
}: {
  firstName: string;
  lastName: string;
  sex: string | null;
  dateOfBirth: Date;
  monitoringMinutesThisMonth: number;
  consentDate: Date | null;
  primaryProviderName: string | null;
  careManagerName: string | null;
  lastCdcesTouchpointAt: Date | null;
  complianceHistory: ComplianceMonth[];
}) {
  return (
    <div className="grid gap-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 lg:grid-cols-[1fr_auto]">
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Field label="Patient name" value={`${firstName} ${lastName}`} />
          <Field label="Gender" value={sex} />
          <Field label="DOB" value={formatDate(dateOfBirth)} />
          <Field label="Provider" value={primaryProviderName} />
        </div>
        <div className="space-y-3">
          <Field label="RPM consent date" value={formatDate(consentDate)} />
          <Field label="RPM CDCES" value={careManagerName} />
          <Field label="Last live contact" value={formatDate(lastCdcesTouchpointAt)} />
          <Field label="Time monitoring this month" value={`${formatMinutes(monitoringMinutesThisMonth)} min`} />
        </div>
      </div>

      <div className="w-full lg:w-56">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Sensor transmission history
        </div>
        <ul className="mt-2 space-y-1.5">
          {complianceHistory.map((m, i) => (
            <li key={`${m.year}-${m.month}`} className="flex items-center justify-between text-sm">
              <span className="text-neutral-600 dark:text-neutral-400">
                {i === 0 ? "This month" : "Last month"}
              </span>
              <span className="tabular-nums text-neutral-800 dark:text-neutral-200">
                {m.daysOfReadings} day{m.daysOfReadings === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
