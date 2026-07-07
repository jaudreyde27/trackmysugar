import { StatusPill } from "@/components/status-pill";
import type { ComplianceMonth } from "@/lib/data/billing";
import type { InsurancePolicy } from "@/generated/prisma/client";

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
  sex,
  clinicalNotes,
  monitoringMinutesThisMonth,
  daysOfReadingsThisMonth,
  mostRecentReadingAt,
  consentDate,
  primaryProviderName,
  careManagerName,
  primaryInsurance,
  phone,
  email,
  complianceHistory,
}: {
  sex: string | null;
  clinicalNotes: string | null;
  monitoringMinutesThisMonth: number;
  daysOfReadingsThisMonth: number;
  mostRecentReadingAt: Date | null;
  consentDate: Date | null;
  primaryProviderName: string | null;
  careManagerName: string | null;
  primaryInsurance: InsurancePolicy | null;
  phone: string | null;
  email: string | null;
  complianceHistory: ComplianceMonth[];
}) {
  return (
    <div className="grid gap-6 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800 lg:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Field label="Gender" value={sex} />
        <Field label="Time spent monitoring" value={`${formatMinutes(monitoringMinutesThisMonth)} min`} />
        <Field label="Provider" value={primaryProviderName} />
        <Field label="Phone" value={phone} />

        <Field label="Days of readings this month" value={daysOfReadingsThisMonth} />
        <Field label="Care manager" value={careManagerName} />
        <Field label="Email" value={email} />
        <Field label="Most recent reading" value={formatDate(mostRecentReadingAt)} />

        <Field label="RPM consent date" value={formatDate(consentDate)} />
        <Field label="Insurance carrier" value={primaryInsurance?.payerName ?? null} />
        <Field label="Insurance member ID" value={primaryInsurance?.memberId ?? null} />
        <div className="col-span-2 sm:col-span-4">
          <Field label="Clinical notes" value={clinicalNotes} />
        </div>
      </div>

      <div className="w-full lg:w-64">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Compliance history
        </div>
        <ul className="mt-2 space-y-2">
          {complianceHistory.map((m, i) => (
            <li
              key={`${m.year}-${m.month}`}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-2.5 py-1.5 dark:border-neutral-800"
            >
              <div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {i === 0 ? "Current month" : i === 1 ? "Last month" : "2 months ago"}
                </div>
                <div className="text-xs text-neutral-400 dark:text-neutral-500">
                  {m.daysOfReadings} day{m.daysOfReadings === 1 ? "" : "s"} of readings
                </div>
              </div>
              <StatusPill label={m.statusLabel} tone={m.tone} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
