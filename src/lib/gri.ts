import type { GlucoseStats } from "@/lib/data/glucose-stats";

export type GriZone = "A" | "B" | "C" | "D" | "E";

// Glycemia Risk Index (GRI): Klonoff DC, Wang J, Rodbard D, et al. "A
// Glycemia Risk Index (GRI) of Hypoglycemia and Hyperglycemia for
// Continuous Glucose Monitoring Validated by Clinician Ratings." J Diabetes
// Sci Technol. 2023;17(5):1226-1242. A single 0-100 composite score (lower
// is better) weighting the AGP time-in-range components toward hypo- and
// severe hyperglycemia. Zone cutoffs below approximate the published
// quintile boundaries (Zone A = best fifth, Zone E = worst fifth) — verify
// against the Diabetes Technology Society's GRI calculator before relying
// on the exact boundary for a clinical decision.
export function computeGRI(stats: GlucoseStats): number | null {
  if (stats.readingCount === 0) return null;

  const raw =
    3.0 * stats.percentVeryLow +
    2.4 * stats.percentLow +
    1.6 * stats.percentVeryHigh +
    0.8 * stats.percentHigh;

  return Math.min(100, Math.max(0, raw));
}

export function getGriZone(score: number): GriZone {
  if (score < 20) return "A";
  if (score < 40) return "B";
  if (score < 60) return "C";
  if (score < 80) return "D";
  return "E";
}

// CSS variable references (see globals.css) so each zone's letter stays
// legible directly against the page background in both light and dark mode.
export const GRI_ZONE_LETTER_COLORS: Record<GriZone, string> = {
  A: "var(--gri-zone-a)",
  B: "var(--gri-zone-b)",
  C: "var(--gri-zone-c)",
  D: "var(--gri-zone-d)",
  E: "var(--gri-zone-e)",
};

export const GRI_ZONE_LABELS: Record<GriZone, string> = {
  A: "Zone A — minimal risk",
  B: "Zone B — low risk",
  C: "Zone C — moderate risk",
  D: "Zone D — high risk",
  E: "Zone E — very high risk",
};
