import { format } from "date-fns";
import {
  getDexcomBaseUrl,
  getDexcomClientId,
  getDexcomClientSecret,
  getDexcomRedirectUri,
} from "@/lib/dexcom/config";
import type { DexcomEgvResponse, DexcomTokenResponse, DexcomTrend } from "@/lib/dexcom/types";
import { EgvTrend } from "@prisma/client";

const DEXCOM_DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss";

export function getDexcomAuthorizationUrl(state: string): string {
  const url = new URL("/v3/oauth2/login", getDexcomBaseUrl());
  url.searchParams.set("client_id", getDexcomClientId());
  url.searchParams.set("redirect_uri", getDexcomRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "offline_access");
  url.searchParams.set("state", state);
  return url.toString();
}

async function requestToken(body: URLSearchParams): Promise<DexcomTokenResponse> {
  const res = await fetch(new URL("/v3/oauth2/token", getDexcomBaseUrl()), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dexcom token request failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<DexcomTokenResponse>;
}

export function exchangeCodeForToken(code: string): Promise<DexcomTokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: getDexcomClientId(),
      client_secret: getDexcomClientSecret(),
      redirect_uri: getDexcomRedirectUri(),
    })
  );
}

export function refreshDexcomToken(refreshToken: string): Promise<DexcomTokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getDexcomClientId(),
      client_secret: getDexcomClientSecret(),
      redirect_uri: getDexcomRedirectUri(),
    })
  );
}

export async function fetchEgvs(
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<DexcomEgvResponse> {
  const url = new URL("/v3/users/self/egvs", getDexcomBaseUrl());
  url.searchParams.set("startDate", format(startDate, DEXCOM_DATE_FORMAT));
  url.searchParams.set("endDate", format(endDate, DEXCOM_DATE_FORMAT));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dexcom EGV request failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<DexcomEgvResponse>;
}

const TREND_MAP: Record<DexcomTrend, EgvTrend> = {
  none: EgvTrend.NONE,
  doubleUp: EgvTrend.DOUBLE_UP,
  singleUp: EgvTrend.SINGLE_UP,
  fortyFiveUp: EgvTrend.FORTY_FIVE_UP,
  flat: EgvTrend.FLAT,
  fortyFiveDown: EgvTrend.FORTY_FIVE_DOWN,
  singleDown: EgvTrend.SINGLE_DOWN,
  doubleDown: EgvTrend.DOUBLE_DOWN,
  notComputable: EgvTrend.NOT_COMPUTABLE,
  rateOutOfRange: EgvTrend.RATE_OUT_OF_RANGE,
};

export function mapDexcomTrend(trend: DexcomTrend | undefined): EgvTrend {
  if (!trend) return EgvTrend.NONE;
  return TREND_MAP[trend] ?? EgvTrend.NONE;
}
