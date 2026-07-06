import type { ConnectionState } from "@/lib/data/roster";

const CONFIG: Record<ConnectionState, { label: string; color: string }> = {
  NOT_CONNECTED: { label: "Not connected", color: "var(--status-neutral)" },
  PENDING: { label: "Pending", color: "var(--status-warning)" },
  ACTIVE: { label: "Connected", color: "var(--status-good)" },
  ERROR: { label: "Sync error", color: "var(--status-critical)" },
  REVOKED: { label: "Disconnected", color: "var(--status-neutral)" },
};

export function ConnectionStatusBadge({ state }: { state: ConnectionState }) {
  const { label, color } = CONFIG[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}
