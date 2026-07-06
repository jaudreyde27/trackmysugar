import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// AES-256-GCM field-level encryption for secrets that must not sit in the
// database in plaintext (Dexcom OAuth tokens), on top of at-rest disk
// encryption provided by the host. Format: base64(iv).base64(authTag).base64(ciphertext)
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32`."
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `APP_ENCRYPTION_KEY must decode to 32 bytes for AES-256, got ${key.length}.`
    );
  }

  cachedKey = key;
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(
    "."
  );
}

export function decryptSecret(encoded: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encoded.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted payload");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}
