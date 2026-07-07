import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

export type NotesSummaryInput = {
  startedAt: Date;
  notes: string;
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

// Deterministic summary used when ANTHROPIC_API_KEY isn't configured, or if
// the API call fails — the notes section must not break either way.
function ruleBasedSummary(sessions: NotesSummaryInput[]): string {
  if (sessions.length === 0) return "No visit notes on file yet.";

  const sorted = [...sessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span =
    sorted.length > 1
      ? `${formatDate(first.startedAt)} – ${formatDate(last.startedAt)}`
      : formatDate(first.startedAt);

  return `${sessions.length} visit note${sessions.length === 1 ? "" : "s"} on file (${span}). Most recent (${formatDate(
    last.startedAt
  )}): "${truncate(last.notes, 180)}"`;
}

function buildPrompt(sessions: NotesSummaryInput[]): string {
  const sorted = [...sessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const notecards = sorted
    .map((s, i) => `Visit ${i + 1} (${formatDate(s.startedAt)}):\n${s.notes.trim()}`)
    .join("\n\n");

  return `Below are chronological CDCES (Certified Diabetes Care and Education
Specialist) visit notes for one patient.

${notecards}

Write a 2-4 sentence synthesis for a clinician glancing at this patient's
record: call out any recurring themes, changes over time, or open concerns.
Base it strictly on the notes above — do not invent details not present.`;
}

// Note: this regenerates on every patient-page view since there's no cache
// of prior summaries — fine for the rule-based fallback, but would incur a
// real API call per view once ANTHROPIC_API_KEY is set in production. Worth
// revisiting (e.g. cache keyed on notecard count) before that happens.
export async function generateNotesSummary(sessions: NotesSummaryInput[]): Promise<string> {
  if (sessions.length === 0) return ruleBasedSummary(sessions);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return ruleBasedSummary(sessions);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system:
        "You help a diabetes care team review patient visit history. Be concise, clinical, and grounded only in the notes given.",
      messages: [{ role: "user", content: buildPrompt(sessions) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : ruleBasedSummary(sessions);
  } catch {
    return ruleBasedSummary(sessions);
  }
}
