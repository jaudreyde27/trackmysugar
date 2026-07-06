import { createHmac, timingSafeEqual } from "crypto";

// Signed, stateless OAuth "state" param: ties a Dexcom authorization
// redirect back to the patient + staff member who initiated it, without
// needing a server-side store. Signed (not encrypted) since it holds no
// secrets, just non-sensitive identifiers plus a timestamp for expiry.
const STATE_TTL_MS = 10 * 60 * 1000;

type StatePayload = {
  patientId: string;
  staffUserId: string;
  iat: number;
};

function getSigningKey(): string {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) throw new Error("APP_ENCRYPTION_KEY is not set");
  return key;
}

function sign(data: string): string {
  return createHmac("sha256", getSigningKey()).update(data).digest("base64url");
}

export function createOAuthState(patientId: string, staffUserId: string): string {
  const payload: StatePayload = { patientId, staffUserId, iat: Date.now() };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(data);
  return `${data}.${signature}`;
}

export function verifyOAuthState(state: string): StatePayload | null {
  const [data, signature] = state.split(".");
  if (!data || !signature) return null;

  const expectedSignature = sign(data);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as StatePayload;
    if (Date.now() - payload.iat > STATE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
