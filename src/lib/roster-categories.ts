import { getGriZone } from "@/lib/gri";
import type { RosterRow } from "@/components/patient-roster-table";

export type RosterCategory = "needs_attention" | "monitor" | "meeting_targets";

export const ROSTER_CATEGORY_ORDER: RosterCategory[] = ["needs_attention", "monitor", "meeting_targets"];

export const ROSTER_CATEGORY_LABELS: Record<RosterCategory, string> = {
  needs_attention: "Needs attention",
  monitor: "Monitor",
  meeting_targets: "Meeting targets",
};

export const ROSTER_CATEGORY_DESCRIPTIONS: Record<RosterCategory, string> = {
  needs_attention: "Connection errors, elevated glycemic risk, or a data gap below the RPM billing threshold",
  monitor: "Stable but not yet consistently meeting targets",
  meeting_targets: "Connected, transmitting, and in a low-risk glycemia zone",
};

const CPT_99454_MIN_DAYS = 16;

// Triage bucketing for the practice worklist — mirrors the "what needs my
// attention first" grouping clinics rely on, using signals we already
// compute (GRI zone, connection health, rolling 30-day transmit count)
// rather than a flat alphabetical list.
export function categorizePatient(row: RosterRow): RosterCategory {
  const zone = row.griScore != null ? getGriZone(row.griScore) : null;

  if (row.connectionState === "ERROR" || zone === "D" || zone === "E" || row.r30Count < CPT_99454_MIN_DAYS) {
    return "needs_attention";
  }
  if ((zone === "A" || zone === "B") && row.connectionState === "ACTIVE") {
    return "meeting_targets";
  }
  return "monitor";
}
