import { createHmac, timingSafeEqual } from "crypto";

// Signed, stateless capability token: identifies which patient a Dexcom
// OAuth authorization is for, without needing a server-side store. The same
// token IS the authorization to redeem the link — nobody needs to be
// logged in to use it, same pattern as a password-reset or invoice-payment
// link. Signed (not encrypted) since it holds no secrets, just a patient id
// plus an expiry.
const DEFAULT_TTL_MS = 10 * 60 * 1000;
export const ENROLLMENT_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StatePayload = {
  patientId: string;
  iat: number;
  ttlMs: number;
};

function getSigningKey(): string {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key) throw new Error("APP_ENCRYPTION_KEY is not set");
  return key;
}

function sign(data: string): string {
  return createHmac("sha256", getSigningKey()).update(data).digest("base64url");
}

export function createOAuthState(patientId: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const payload: StatePayload = { patientId, iat: Date.now(), ttlMs };
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
    if (Date.now() - payload.iat > payload.ttlMs) return null;
    return payload;
  } catch {
    return null;
  }
}
