import type { ComponentType, SVGProps } from "react";
import type { CgmDevice, InsulinDeliveryDevice } from "@/generated/prisma/client";
import {
  DexcomIcon,
  LibreIcon,
  OmnipodIcon,
  TandemIcon,
  MedtronicIcon,
  MdiIcon,
} from "@/components/device-icons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const CGM_CONFIG: Record<CgmDevice, { label: string; Icon: IconComponent; color: string }> = {
  DEXCOM: { label: "Dexcom", Icon: DexcomIcon, color: "var(--cat-blue)" },
  FREESTYLE_LIBRE: { label: "Libre", Icon: LibreIcon, color: "var(--cat-aqua)" },
};

const PUMP_CONFIG: Record<InsulinDeliveryDevice, { label: string; Icon: IconComponent; color: string }> = {
  OMNIPOD: { label: "Omnipod", Icon: OmnipodIcon, color: "var(--cat-violet)" },
  TANDEM: { label: "Tandem", Icon: TandemIcon, color: "var(--cat-orange)" },
  MEDTRONIC: { label: "Medtronic", Icon: MedtronicIcon, color: "var(--cat-green)" },
  MDI: { label: "MDI", Icon: MdiIcon, color: "var(--status-neutral)" },
};

function DeviceBadge({ label, Icon, color }: { label: string; Icon: IconComponent; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300">
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        <Icon width={13} height={13} />
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
