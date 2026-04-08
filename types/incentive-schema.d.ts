declare module "@/lib/incentive-schema" {
  export type ValidationFlag = {
    level: "info" | "warning" | "error";
    field: string;
    message: string;
  };

  export function buildEmptyCampaignSchema(meta?: {
    insurerCode?: string | null;
    insurerName?: string | null;
    campaignName?: string | null;
    campaignYear?: number | null;
    campaignMonth?: number | null;
    weekLabel?: string | null;
    salesPeriodStart?: string | null;
    salesPeriodEnd?: string | null;
  }): any;

  export function normalizeIncentiveJson(payload: any, meta?: any): any;
  export function buildValidationFlags(payload: any): ValidationFlag[];
  export function prettyJson(value: any): string;
  export function summarizePayload(payload: any): string[];
}
