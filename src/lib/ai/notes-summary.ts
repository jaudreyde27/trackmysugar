import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

export type NotesSummaryInput = {
  startedAt: Date;
  notes: string;
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function joinWithAnd(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

// Keyword-based approximation of "themes discussed" for the no-LLM fallback.
// Crude compared to real synthesis, but far better than just restating the
// most recent session date — a clinician glancing at this wants to know what
// keeps coming up across sessions, not just when they happened.
const THEME_KEYWORDS: Array<{ label: string; pattern: RegExp }> = [
  { label: "sensor site/adhesion issues", pattern: /sensor (site|placement|adhes\w*)/i },
  { label: "pump settings", pattern: /pump (setting|start|therapy)/i },
  { label: "carb counting", pattern: /carb[- ]count\w*/i },
  { label: "hypoglycemia", pattern: /hypoglycemi\w*|\blows?\b/i },
  { label: "hyperglycemia/highs", pattern: /hyperglycemi\w*|postprandial spike/i },
  { label: "time in range trends", pattern: /time in range/i },
  { label: "travel/schedule changes", pattern: /travel|time zone/i },
  { label: "medication/dosing adjustments", pattern: /medication|insulin dos\w*|basal rate/i },
  { label: "diet/food log review", pattern: /food log|\bdiet\b/i },
];

function extractThemes(sessions: NotesSummaryInput[], max = 3): string[] {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    for (const { label, pattern } of THEME_KEYWORDS) {
      if (pattern.test(s.notes)) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([label]) => label);
}

// Deterministic summary used when ANTHROPIC_API_KEY isn't configured, or if
// the API call fails — the notes section must not break either way. Themes
// come from simple keyword matching rather than real synthesis, but still
// gives a clinician something more useful than just a session count. Always
// exactly two complete sentences — never embeds raw note text, which is
// what previously forced an ellipsis mid-sentence.
function ruleBasedSummary(patientName: string, sessions: NotesSummaryInput[]): string {
  if (sessions.length === 0) return `${patientName} has had no RPM sessions in the last year.`;

  const themes = extractThemes(sessions);
  const themesSentence =
    themes.length > 0
      ? `Core themes of discussion include ${joinWithAnd(themes)}.`
      : "No recurring themes were identified in the notes.";

  return `${patientName} has had ${sessions.length} RPM session${
    sessions.length === 1 ? "" : "s"
  } over the last year. ${themesSentence}`;
}

function buildPrompt(patientName: string, sessions: NotesSummaryInput[]): string {
  const sorted = [...sessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const notecards = sorted
    .map((s, i) => `RPM Session ${i + 1} (${formatDate(s.startedAt)}):\n${s.notes.trim()}`)
    .join("\n\n");
  const count = sessions.length;

  return `Below are chronological CDCES (Certified Diabetes Care and Education
Specialist) RPM session notes for ${patientName} — ${count} RPM session${
    count === 1 ? "" : "s"
  } in the last year. Boilerplate template language has already been stripped out;
only the free text the CDCES actually wrote is shown.

${notecards}

Write a synthesis for a clinician glancing at this patient's record, in
EXACTLY two sentences, no more:
1. "${patientName} has had ${count} RPM session${count === 1 ? "" : "s"} over the last year."
2. One sentence starting with "Core themes of discussion include" naming 2-3
   recurring themes, trends, or open concerns across the sessions.
Keep both sentences complete and succinct — do not truncate or trail off.
Base it strictly on the notes above — do not invent details not present.`;
}

// Note: this regenerates on every patient-page view since there's no cache
// of prior summaries — fine for the rule-based fallback, but would incur a
// real API call per view once ANTHROPIC_API_KEY is set in production. Worth
// revisiting (e.g. cache keyed on notecard count) before that happens.
export async function generateNotesSummary(
  patientName: string,
  sessions: NotesSummaryInput[]
): Promise<string> {
  if (sessions.length === 0) return ruleBasedSummary(patientName, sessions);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return ruleBasedSummary(patientName, sessions);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 150,
      system:
        "You help a diabetes care team review patient RPM session history. Be concise, clinical, and grounded only in the notes given.",
      messages: [{ role: "user", content: buildPrompt(patientName, sessions) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : ruleBasedSummary(patientName, sessions);
  } catch {
    return ruleBasedSummary(patientName, sessions);
  }
}
