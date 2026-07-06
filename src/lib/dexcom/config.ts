export type DexcomEnv = "sandbox" | "production";

function getEnv(): DexcomEnv {
  const env = process.env.DEXCOM_ENVIRONMENT ?? "sandbox";
  if (env !== "sandbox" && env !== "production") {
    throw new Error(`DEXCOM_ENVIRONMENT must be "sandbox" or "production", got "${env}"`);
  }
  return env;
}

export function getDexcomBaseUrl(): string {
  return getEnv() === "production"
    ? "https://api.dexcom.com"
    : "https://sandbox-api.dexcom.com";
}

export function getDexcomEnvironment(): DexcomEnv {
  return getEnv();
}

export function getDexcomClientId(): string {
  const id = process.env.DEXCOM_CLIENT_ID;
  if (!id) throw new Error("DEXCOM_CLIENT_ID is not set");
  return id;
}

export function getDexcomClientSecret(): string {
  const secret = process.env.DEXCOM_CLIENT_SECRET;
  if (!secret) throw new Error("DEXCOM_CLIENT_SECRET is not set");
  return secret;
}

export function getDexcomRedirectUri(): string {
  const uri = process.env.DEXCOM_REDIRECT_URI;
  if (!uri) throw new Error("DEXCOM_REDIRECT_URI is not set");
  return uri;
}
