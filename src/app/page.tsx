import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { getPatientRoster } from "@/lib/data/roster";
import { TopNav } from "@/components/top-nav";
import { ConnectionStatusBadge } from "@/components/connection-status-badge";
import { StreakTicker } from "@/components/streak-ticker";
import { TimeInRangeBar } from "@/components/time-in-range-bar";

function diabetesTypeLabel(type: "TYPE_1" | "TYPE_2") {
  return type === "TYPE_1" ? "Type 1" : "Type 2";
}

function formatRelative(date: Date | null): string {
  if (!date) return "Never";
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default async function HomePage() {
  const session = await verifySession();
  const roster = await getPatientRoster();

  const needsAttention = roster.filter(
    (p) => p.connectionState === "ERROR" || p.streak === 0
  ).length;
  const connected = roster.filter((p) => p.connectionState === "ACTIVE").length;
  const withData = roster.filter((p) => p.stats.readingCount > 0);
  const avgTir =
    withData.length > 0
      ? withData.reduce((sum, p) => sum + p.stats.percentInRange, 0) / withData.length
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav staffName={session.staffUser.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Practice overview
        </h1>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatTile label="Patients" value={String(roster.length)} />
          <StatTile label="Dexcom connected" value={`${connected}/${roster.length}`} />
          <StatTile
            label="Avg time in range (14d)"
            value={avgTir != null ? `${avgTir.toFixed(0)}%` : "—"}
          />
          <StatTile
            label="Needs attention"
            value={String(needsAttention)}
            tone={needsAttention > 0 ? "critical" : "good"}
          />
        </div>

        <div className="mt-8 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Streak</th>
                <th className="px-4 py-3 font-medium">Avg glucose (14d)</th>
                <th className="px-4 py-3 font-medium">GMI</th>
                <th className="px-4 py-3 font-medium">Time in range</th>
                <th className="px-4 py-3 font-medium">Dexcom</th>
                <th className="px-4 py-3 font-medium">Last sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900">
              {roster.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                    >
                      {patient.lastName}, {patient.firstName}
                    </Link>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {patient.mrn}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                    {diabetesTypeLabel(patient.diabetesType)}
                  </td>
                  <td className="px-4 py-3">
                    <StreakTicker streak={patient.streak} size="sm" />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-neutral-700 dark:text-neutral-300">
                    {patient.stats.averageGlucose != null
                      ? `${patient.stats.averageGlucose.toFixed(0)} mg/dL`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-neutral-700 dark:text-neutral-300">
                    {patient.stats.gmi != null ? `${patient.stats.gmi.toFixed(1)}%` : "—"}
                  </td>
                  <td className="w-40 px-4 py-3">
                    <TimeInRangeBar stats={patient.stats} />
                  </td>
                  <td className="px-4 py-3">
                    <ConnectionStatusBadge state={patient.connectionState} />
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {formatRelative(patient.lastSyncSuccessAt)}
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                    No patients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "critical";
}) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
      <div
        className="mt-1 text-2xl font-semibold tabular-nums"
        style={{
          color:
            tone === "critical"
              ? "var(--status-critical)"
              : tone === "good"
                ? "var(--status-good)"
                : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}
