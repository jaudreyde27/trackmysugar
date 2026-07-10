// Plain constants with zero runtime dependencies, safe to import from
// Client Components — unlike the modules that compute the metrics using
// them (e.g. src/lib/sync/streak.ts), which pull in the Prisma client and
// so must stay Server-Component-only.
export const R30_WINDOW_DAYS = 30;

// Fixed platform-wide quick-note templates for the Notes panel — not
// org-configurable. `label` is the chip text; `boilerplate` is appended to
// the note body when clicked. "RPM Completed" is the only one that counts
// as an RPM session/touchpoint (see getLastTouchpointFor* in
// src/lib/data/monitoring.ts) — the rest are notes only, aggregated on the
// patient page but not counted as a session. "Chart Comment" doubles as the
// machine-checked proxy for CPT 95251 (CGM interpretation documented) —
// see hasCgmInterpretationForMonth in src/lib/data/monitoring.ts.
export const NOTE_TEMPLATES = [
  { label: "RPM Completed", boilerplate: "RPM check-in completed." },
  { label: "Left Voicemail", boilerplate: "Attempted to reach patient by phone; left voicemail." },
  { label: "Unable to Leave Voicemail", boilerplate: "Attempted to reach patient by phone; unable to leave voicemail." },
  { label: "Chart Comment", boilerplate: "Reviewed CGM data and chart for this reporting period." },
] as const;

export const RPM_COMPLETED_LABEL = "RPM Completed";

// Strips known template boilerplate out of a note before it's fed to the AI
// summary — the summary should reflect what the CDCES actually wrote, not
// the fixed chip text that autopopulates when a template is clicked.
export function stripTemplateBoilerplate(text: string): string {
  let result = text;
  for (const t of NOTE_TEMPLATES) {
    result = result.split(t.boilerplate).join(" ");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}
