import { getGriZone, GRI_ZONE_LETTER_COLORS, GRI_ZONE_LABELS } from "@/lib/gri";

export function GriZoneBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs text-neutral-400 dark:text-neutral-500">—</span>;
  }

  const zone = getGriZone(score);

  return (
    <span
      className="text-xl font-bold leading-none"
      style={{ color: GRI_ZONE_LETTER_COLORS[zone] }}
      title={`${GRI_ZONE_LABELS[zone]} (GRI ${score.toFixed(0)})`}
    >
      {zone}
    </span>
  );
}
