import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";
const R30_ADEQUATE_THRESHOLD = 16;
const TIR_TARGET_PERCENT = 70;
const TBR_MAX_PERCENT = 4;

export type PatientCallContext = {
  firstName: string;
  lastName: string;
  primaryDiagnosisCode: string;
  cgmDevice: string | null;
  insulinDeliveryDevice: string | null;
  streak: number;
  r30Count: number;
  averageGlucose: number | null;
  gmi: number | null;
  percentVeryLow: number;
  percentLow: number;
  percentInRange: number;
  connectionState: string;
  lastTouchpointAt: Date | null;
};

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

// Deterministic summary used when ANTHROPIC_API_KEY isn't configured, or if
// the API call fails — the call workflow must not break either way.
function ruleBasedTalkingPoints(ctx: PatientCallContext): string {
  const points: string[] = [];
  const daysSinceTouchpoint = daysSince(ctx.lastTouchpointAt);
  const percentBelowRange = ctx.percentVeryLow + ctx.percentLow;

  if (ctx.connectionState !== "ACTIVE") {
    points.push(`Dexcom is not actively connected (status: ${ctx.connectionState}) — confirm the patient's sensor is paired and reconnect if needed.`);
  }
  if (ctx.r30Count < R30_ADEQUATE_THRESHOLD) {
    points.push(`Only ${ctx.r30Count} of the last 30 days have transmitted data — ask about sensor wear time or connectivity issues.`);
  }
  if (ctx.streak === 0) {
    points.push("No data has transmitted in the last completed day — check in on sensor status.");
  }
  if (ctx.percentInRange > 0 && ctx.percentInRange < TIR_TARGET_PERCENT) {
    points.push(`Time in range is ${ctx.percentInRange.toFixed(0)}%, below the ${TIR_TARGET_PERCENT}% target — review recent patterns together.`);
  }
  if (percentBelowRange > TBR_MAX_PERCENT) {
    points.push(`Time below range is ${percentBelowRange.toFixed(0)}%, above the ${TBR_MAX_PERCENT}% ceiling — discuss recent hypoglycemia episodes.`);
  }
  if (daysSinceTouchpoint == null) {
    points.push("No prior CDCES touchpoint on record — this is the first outreach.");
  } else if (daysSinceTouchpoint > 90) {
    points.push(`Last touchpoint was ${daysSinceTouchpoint} days ago — overdue for routine follow-up.`);
  }
  if (points.length === 0) {
    points.push("Metrics are within target ranges — a good opportunity for positive reinforcement and routine check-in.");
  }

  return points.map((p) => `- ${p}`).join("\n");
}

function buildPrompt(ctx: PatientCallContext): string {
  const daysSinceTouchpoint = daysSince(ctx.lastTouchpointAt);
  return `Patient: ${ctx.firstName} ${ctx.lastName}
Primary diagnosis (ICD-10): ${ctx.primaryDiagnosisCode}
CGM device: ${ctx.cgmDevice ?? "not documented"}
Insulin delivery: ${ctx.insulinDeliveryDevice ?? "not documented"}
Dexcom connection status: ${ctx.connectionState}
Current consecutive-day streak with data transmitted: ${ctx.streak}
Days with data in the last 30 (R30): ${ctx.r30Count}/30
Average glucose (14d): ${ctx.averageGlucose != null ? `${ctx.averageGlucose.toFixed(0)} mg/dL` : "no data"}
GMI (14d): ${ctx.gmi != null ? `${ctx.gmi.toFixed(1)}%` : "no data"}
Time in range (14d): ${ctx.percentInRange.toFixed(0)}%
Time below range (14d, very low + low): ${(ctx.percentVeryLow + ctx.percentLow).toFixed(0)}%
Days since last CDCES touchpoint: ${daysSinceTouchpoint ?? "no prior touchpoint on record"}

Generate 3-5 concise, clinically relevant talking points for a CDCES (Certified
Diabetes Care and Education Specialist) about to call this patient. Base every
point strictly on the data above — do not invent details not provided. Format
as a markdown bullet list, one short sentence per bullet.`;
}

export async function generateTalkingPoints(ctx: PatientCallContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return ruleBasedTalkingPoints(ctx);
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You help a diabetes care team prepare for patient check-in calls. Be concise, clinical, and grounded only in the data given.",
      messages: [{ role: "user", content: buildPrompt(ctx) }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock && textBlock.type === "text" ? textBlock.text : ruleBasedTalkingPoints(ctx);
  } catch {
    return ruleBasedTalkingPoints(ctx);
  }
}
