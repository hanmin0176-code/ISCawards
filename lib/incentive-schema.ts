export type ValidationFlag = {
  level: "info" | "warning" | "error";
  field: string;
  message: string;
};

type CampaignMetaInput = {
  insurerCode?: string | null;
  insurerName?: string | null;
  campaignName?: string | null;
  campaignYear?: number | null;
  campaignMonth?: number | null;
  weekLabel?: string | null;
  salesPeriodStart?: string | null;
  salesPeriodEnd?: string | null;
};

export function buildEmptyCampaignSchema(meta: CampaignMetaInput = {}) {
  return {
    schema_version: "1.0.0",
    campaign_meta: {
      insurer_code: meta.insurerCode ?? "",
      insurer_name: meta.insurerName ?? "",
      campaign_name: meta.campaignName ?? "",
      campaign_year: meta.campaignYear ?? new Date().getFullYear(),
      campaign_month: meta.campaignMonth ?? new Date().getMonth() + 1,
      week_label: meta.weekLabel ?? "",
      sales_period_start: meta.salesPeriodStart ?? null,
      sales_period_end: meta.salesPeriodEnd ?? null,
      currency: "KRW",
    },
    source_meta: {
      source_type: "image",
      source_file_name: "",
      ai_model_name: process.env.OPENAI_PARSER_MODEL ?? "gpt-4o-mini",
      prompt_version: "parse_v1",
      raw_ocr_text: "",
      confidence: "medium",
    },
    global_rules: {
      default_metric_type: "premium_amount",
      default_currency_unit: "KRW",
      requires_admin_review: true,
      retention_years: 3,
    },
    sections: [],
    validation_flags: [
      {
        level: "info",
        field: "sections",
        message: "아직 섹션이 없습니다. 이미지 업로드 후 AI 분석 또는 수기 입력이 필요합니다.",
      },
    ],
  };
}

export function normalizeIncentiveJson(payload: any, meta: CampaignMetaInput = {}) {
  const base = buildEmptyCampaignSchema(meta);
  const merged = {
    ...base,
    ...(payload ?? {}),
    campaign_meta: {
      ...base.campaign_meta,
      ...(payload?.campaign_meta ?? {}),
    },
    source_meta: {
      ...base.source_meta,
      ...(payload?.source_meta ?? {}),
    },
    global_rules: {
      ...base.global_rules,
      ...(payload?.global_rules ?? {}),
    },
    sections: Array.isArray(payload?.sections) ? payload.sections : [],
    validation_flags: Array.isArray(payload?.validation_flags)
      ? payload.validation_flags
      : [],
  };

  return merged;
}

export function buildValidationFlags(payload: any): ValidationFlag[] {
  const flags: ValidationFlag[] = [];

  if (!payload?.campaign_meta?.insurer_name) {
    flags.push({
      level: "warning",
      field: "campaign_meta.insurer_name",
      message: "보험사명이 비어 있습니다.",
    });
  }

  if (!payload?.campaign_meta?.campaign_name) {
    flags.push({
      level: "warning",
      field: "campaign_meta.campaign_name",
      message: "시상안명이 비어 있습니다.",
    });
  }

  if (!Array.isArray(payload?.sections) || payload.sections.length === 0) {
    flags.push({
      level: "warning",
      field: "sections",
      message: "섹션이 비어 있습니다. 실제 계산에 투입하기 전 반드시 입력이 필요합니다.",
    });
  }

  if (Array.isArray(payload?.sections)) {
    payload.sections.forEach((section: any, index: number) => {
      if (!section?.section_name) {
        flags.push({
          level: "warning",
          field: `sections[${index}].section_name`,
          message: "섹션명이 없습니다.",
        });
      }

      if (!Array.isArray(section?.tiers) || section.tiers.length === 0) {
        flags.push({
          level: "info",
          field: `sections[${index}].tiers`,
          message: "해당 섹션의 구간 정보가 비어 있습니다.",
        });
      }
    });
  }

  return flags;
}

export function prettyJson(value: any) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function summarizePayload(payload: any) {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];

  if (sections.length === 0) {
    return ["섹션이 아직 없습니다."];
  }

  return sections.slice(0, 6).map((section: any, index: number) => {
    const tierCount = Array.isArray(section?.tiers) ? section.tiers.length : 0;
    const maintenance = section?.maintenance_policy?.required
      ? ` / ${section.maintenance_policy.round_no ?? "유지"}회차 유지`
      : "";

    return `${index + 1}. ${section.section_name ?? "무제 섹션"} (구간 ${tierCount}개${maintenance})`;
  });
}
