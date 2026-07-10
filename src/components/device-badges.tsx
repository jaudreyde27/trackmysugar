import type { ComponentType, SVGProps } from "react";
import type { CgmDevice, InsulinDeliveryDevice } from "@prisma/client";
import {
  DexcomIcon,
  LibreIcon,
  OmnipodIcon,
  TandemIcon,
  MedtronicIcon,
} from "@/components/device-icons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type DeviceConfig = { label: string; Icon: IconComponent; color: string; iconColor?: string };

// Brand + model, not just brand — e.g. "Dexcom G7 15-Day" rather than just
// "Dexcom" — so the badge alone identifies the specific device in use.
const CGM_CONFIG: Record<CgmDevice, DeviceConfig> = {
  DEXCOM: { label: "Dexcom G7 15-Day", Icon: DexcomIcon, color: "var(--cat-dexcom-green)" },
  FREESTYLE_LIBRE: {
    label: "FreeStyle Libre 3",
    Icon: LibreIcon,
    color: "var(--cat-libre-yellow)",
    iconColor: "#171717",
  },
};

// Real pump devices only — MDI (multiple daily injections) means the patient
// has no pump, so it's handled as an absence case rather than a badge.
const PUMP_CONFIG: Record<Exclude<InsulinDeliveryDevice, "MDI">, DeviceConfig> = {
  OMNIPOD: { label: "Omnipod 5", Icon: OmnipodIcon, color: "var(--cat-violet)" },
  TANDEM: { label: "Tandem t:slim X2", Icon: TandemIcon, color: "var(--cat-blue)" },
  MEDTRONIC: { label: "Medtronic MiniMed 780G", Icon: MedtronicIcon, color: "var(--cat-medtronic-navy)" },
};

function hasPump(device: InsulinDeliveryDevice | null): device is Exclude<InsulinDeliveryDevice, "MDI"> {
  return device != null && device !== "MDI";
}

function DeviceBadge({
  label,
  Icon,
  color,
  iconColor = "#ffffff",
  size = "sm",
}: DeviceConfig & { size?: "sm" | "md" }) {
  const badgeSize = size === "md" ? "h-7 w-7" : "h-5 w-5";
  const iconSize = size === "md" ? 17 : 13;
  const textSize = size === "md" ? "text-sm" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1.5 ${textSize} text-neutral-700 dark:text-neutral-300`}>
      <span
        className={`inline-flex ${badgeSize} shrink-0 items-center justify-center rounded-full`}
        style={{ backgroundColor: color, color: iconColor }}
        aria-hidden
      >
        <Icon width={iconSize} height={iconSize} />
      </span>
      {label}
    </span>
  );
}

export function CgmDeviceBadge({ device, size }: { device: CgmDevice | null; size?: "sm" | "md" }) {
  if (!device) return <span className="text-xs text-neutral-400 dark:text-neutral-500">Not documented</span>;
  return <DeviceBadge {...CGM_CONFIG[device]} size={size} />;
}

export function PumpDeviceBadge({
  device,
  size,
}: {
  device: InsulinDeliveryDevice | null;
  size?: "sm" | "md";
}) {
  if (!hasPump(device)) {
    return <span className="text-xs text-neutral-400 dark:text-neutral-500">No pump</span>;
  }
  return <DeviceBadge {...PUMP_CONFIG[device]} size={size} />;
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
      {hasPump(insulinDeliveryDevice) && <DeviceBadge {...PUMP_CONFIG[insulinDeliveryDevice]} />}
    </div>
  );
}
