// Original pictogram glyphs — not brand logos. Dexcom/Abbott/Insulet/Tandem/
// Medtronic trademarks aren't licensed here, so each device gets a simple
// generic icon distinct enough to tell devices apart at a glance, always
// paired with a text label (never color/icon alone).
import type { SVGProps } from "react";

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

// Round CGM sensor patch with its transmitter dot.
export function DexcomIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="15.5" cy="8.5" r="2" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

// Oval CGM sensor patch.
export function LibreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="12" rx="8.5" ry="6" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

// Tubeless pod shape.
export function OmnipodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 3c3.3 0 5.5 3.2 5.5 7.5v3c0 4.3-2.2 7.5-5.5 7.5s-5.5-3.2-5.5-7.5v-3C6.5 6.2 8.7 3 12 3z" />
      <circle cx="12" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

// Handheld pump with a touchscreen.
export function TandemIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <rect x="8.2" y="6" width="7.6" height="8" rx="0.8" />
    </IconBase>
  );
}

// Pump with a control dial.
export function MedtronicIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="5.5" y="4" width="13" height="16" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

// Injector pen for multiple daily injections.
export function MdiIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="10.2" width="13" height="4.6" rx="2.3" transform="rotate(-35 10 12.5)" />
      <path d="M18.5 8.5l2-2" />
    </IconBase>
  );
}
