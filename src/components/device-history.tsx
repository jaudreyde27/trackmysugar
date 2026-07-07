import type { DeviceHistoryEntry } from "@/lib/data/patient-detail";
import type { CgmDevice, InsulinDeliveryDevice } from "@/generated/prisma/client";

const CGM_LABELS: Record<CgmDevice, string> = {
  DEXCOM: "Dexcom",
  FREESTYLE_LIBRE: "FreeStyle Libre",
};

const PUMP_LABELS: Record<InsulinDeliveryDevice, string> = {
  OMNIPOD: "Omnipod",
  TANDEM: "Tandem",
  MEDTRONIC: "Medtronic",
  MDI: "MDI",
};

function formatMonthYear(date: Date): string {
  return new Date(date).toLocaleDateString([], { month: "short", year: "numeric" });
}

function DeviceHistoryList({
  entries,
  deviceLabel,
}: {
  entries: DeviceHistoryEntry[];
  deviceLabel: (entry: DeviceHistoryEntry) => string | null;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">No history on file.</p>;
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return (
    <ul className="space-y-1.5 text-sm">
      {sorted.map((entry, i) => {
        const label = deviceLabel(entry);
        if (!label) return null;
        return (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className="text-neutral-700 dark:text-neutral-300">{label}</span>
            <span className="tabular-nums text-xs text-neutral-500 dark:text-neutral-400">
              {formatMonthYear(entry.startedAt)} – {entry.endedAt ? formatMonthYear(entry.endedAt) : "Present"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function DeviceHistorySection({ history }: { history: DeviceHistoryEntry[] }) {
  const cgmEntries = history.filter((h) => h.category === "CGM");
  const pumpEntries = history.filter((h) => h.category === "PUMP");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          CGM
        </div>
        <div className="mt-2">
          <DeviceHistoryList
            entries={cgmEntries}
            deviceLabel={(e) => (e.cgmDevice ? CGM_LABELS[e.cgmDevice] : null)}
          />
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Pump
        </div>
        <div className="mt-2">
          <DeviceHistoryList
            entries={pumpEntries}
            deviceLabel={(e) => (e.insulinDeliveryDevice ? PUMP_LABELS[e.insulinDeliveryDevice] : null)}
          />
        </div>
      </div>
    </div>
  );
}
