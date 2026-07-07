export type DexcomTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export type DexcomTrend =
  | "none"
  | "doubleUp"
  | "singleUp"
  | "fortyFiveUp"
  | "flat"
  | "fortyFiveDown"
  | "singleDown"
  | "doubleDown"
  | "notComputable"
  | "rateOutOfRange";

export type DexcomEgv = {
  systemTime: string;
  displayTime: string;
  value: number;
  unit?: string;
  trend?: DexcomTrend;
  trendRate?: number | null;
};

export type DexcomEgvResponse = {
  recordType: string;
  recordVersion: string;
  userId: string;
  records: DexcomEgv[];
};
