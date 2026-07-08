import { prisma } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { refreshDexcomToken } from "@/lib/dexcom/client";
import { getDexcomEnvironment } from "@/lib/dexcom/config";
import type { DexcomConnection } from "@prisma/client";
import type { DexcomTokenResponse } from "@/lib/dexcom/types";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function saveDexcomTokens(patientId: string, tokens: DexcomTokenResponse) {
  const accessTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  return prisma.dexcomConnection.upsert({
    where: { patientId },
    create: {
      patientId,
      environment: getDexcomEnvironment() === "production" ? "PRODUCTION" : "SANDBOX",
      status: "ACTIVE",
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: encryptSecret(tokens.refresh_token),
      accessTokenExpiresAt,
      scope: tokens.scope,
      connectedAt: new Date(),
      lastError: null,
    },
    update: {
      environment: getDexcomEnvironment() === "production" ? "PRODUCTION" : "SANDBOX",
      status: "ACTIVE",
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: encryptSecret(tokens.refresh_token),
      accessTokenExpiresAt,
      scope: tokens.scope,
      connectedAt: new Date(),
      revokedAt: null,
      lastError: null,
    },
  });
}

// Returns a usable access token for the connection, refreshing (and
// persisting the new tokens) first if the current one is expired or about
// to expire. Marks the connection as ERROR if the refresh itself fails
// (e.g. the patient revoked access on Dexcom's side).
export async function getValidAccessToken(connection: DexcomConnection): Promise<string> {
  if (!connection.encryptedAccessToken || !connection.encryptedRefreshToken) {
    throw new Error("Connection has no stored tokens");
  }

  const expiresAt = connection.accessTokenExpiresAt?.getTime() ?? 0;
  if (expiresAt - Date.now() > REFRESH_BUFFER_MS) {
    return decryptSecret(connection.encryptedAccessToken);
  }

  const refreshToken = decryptSecret(connection.encryptedRefreshToken);

  try {
    const tokens = await refreshDexcomToken(refreshToken);
    const updated = await saveDexcomTokens(connection.patientId, tokens);
    return decryptSecret(updated.encryptedAccessToken!);
  } catch (err) {
    await prisma.dexcomConnection.update({
      where: { id: connection.id },
      data: { status: "ERROR", lastError: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}
