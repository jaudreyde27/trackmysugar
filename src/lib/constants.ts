// Plain constants with zero runtime dependencies, safe to import from
// Client Components — unlike the modules that compute the metrics using
// them (e.g. src/lib/sync/streak.ts), which pull in the Prisma client and
// so must stay Server-Component-only.
export const R30_WINDOW_DAYS = 30;

// Fixed platform-wide quick-note templates for the Notes panel — not
// org-configurable. `label` is the chip text; `boilerplate` is appended to
// the note body when clicked. "RPM Completed" is the only one that counts
// as a CDCES visit/touchpoint (see getLastTouchpointFor* in
// src/lib/data/monitoring.ts) — the rest are notes only, aggregated on the
// patient page but not counted as a visit. "Chart Comment" doubles as the
// machine-checked proxy for CPT 95251 (CGM interpretation documented) —
// see hasCgmInterpretationForMonth in src/lib/data/monitoring.ts.
export const NOTE_TEMPLATES = [
  { label: "RPM Completed", boilerplate: "RPM check-in completed." },
  { label: "Left Voicemail", boilerplate: "Attempted to reach patient by phone; left voicemail." },
  { label: "Unable to Leave Voicemail", boilerplate: "Attempted to reach patient by phone; unable to leave voicemail." },
  { label: "Chart Comment", boilerplate: "Reviewed CGM data and chart for this reporting period." },
] as const;
