import type { CgmDevice, InsulinDeliveryDevice } from "@/generated/prisma/client";

const CGM_CONFIG: Record<CgmDevice, { label: string; monogram: string; color: string }> = {
  DEXCOM: { label: "Dexcom", monogram: "DX", color: "var(--cat-blue)" },
  FREESTYLE_LIBRE: { label: "Libre", monogram: "LB", color: "var(--cat-aqua)" },
};

const PUMP_CONFIG: Record<InsulinDeliveryDevice, { label: string; monogram: string; color: string }> = {
  OMNIPOD: { label: "Omnipod", monogram: "OP", color: "var(--cat-violet)" },
  TANDEM: { label: "Tandem", monogram: "TD", color: "var(--cat-orange)" },
  MEDTRONIC: { label: "Medtronic", monogram: "MT", color: "var(--cat-green)" },
  MDI: { label: "MDI", monogram: "MDI", color: "var(--status-neutral)" },
};

function DeviceBadge({ label, monogram, color }: { label: string; monogram: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
      <span
        className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        {monogram}
      </span>
      {label}
    </span>
  );
}

export function DeviceBadges({
  cgmDevice,
  insulinDeliveryDevice,
}: {
  cgmDevice: CgmDevice | null;
  insulinDeliveryDevice: InsulinDeliveryDevice | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      {cgmDevice ? (
        <DeviceBadge {...CGM_CONFIG[cgmDevice]} />
      ) : (
        <span className="text-xs text-neutral-400 dark:text-neutral-500">CGM: —</span>
      )}
      {insulinDeliveryDevice ? (
        <DeviceBadge {...PUMP_CONFIG[insulinDeliveryDevice]} />
      ) : (
        <span className="text-xs text-neutral-400 dark:text-neutral-500">Delivery: —</span>
      )}
    </div>
  );
}
