import type { ConnectionState } from "@/lib/data/roster";

function formatDateTime(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
      <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}

// Three distinct states a clinician needs to tell apart at a glance: no
// sensor documented at all, a documented sensor that just isn't producing
// data (could be worn inconsistently, or never actually paired), and an
// active Dexcom API error blocking sync entirely.
export function CgmStatusLine({
  cgmDevice,
  connectionState,
  lastError,
  lastSyncSuccessAt,
  r30Count,
  environment,
}: {
  cgmDevice: string | null;
  connectionState: ConnectionState;
  lastError: string | null;
  lastSyncSuccessAt: Date | null;
  r30Count: number;
  environment: "SANDBOX" | "PRODUCTION" | null;
}) {
  if (!cgmDevice) {
    return <StatusDot color="var(--status-neutral)" label="No sensor on file" />;
  }

  if (connectionState === "ERROR") {
    return (
      <div>
        <StatusDot color="var(--status-critical)" label="Dexcom sync error" />
        {lastError && (
          <p className="mt-1 max-w-md text-xs text-red-600 dark:text-red-400">{lastError}</p>
        )}
      </div>
    );
  }

  if (r30Count === 0) {
    return <StatusDot color="var(--status-warning)" label="No data transmitted in the last 30 days" />;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <StatusDot color="var(--status-good)" label="Receiving data" />
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        Last sensor data sync: {formatDateTime(lastSyncSuccessAt)}
        {environment === "SANDBOX" && " · sandbox data"}
      </span>
    </div>
  );
}
