import { getGriZone, GRI_ZONE_COLORS, GRI_ZONE_LABELS } from "@/lib/gri";

export function GriZoneBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs text-neutral-400 dark:text-neutral-500">—</span>;
  }

  const zone = getGriZone(score);
  const { bg, text } = GRI_ZONE_COLORS[zone];

  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold"
      style={{ backgroundColor: bg, color: text }}
      title={`${GRI_ZONE_LABELS[zone]} (GRI ${score.toFixed(0)})`}
    >
      {zone}
    </span>
  );
}
