import "server-only";

import OpenAI from "openai";

import {
  buildEmptyCampaignSchema,
  buildValidationFlags,
  normalizeIncentiveJson,
} from "@/lib/incentive-schema";

type ParseInput = {
  imageDataUrl: string | null;
  insurerCode: string;
  insurerName: string;
  campaignName: string;
  campaignYear: number;
  campaignMonth: number;
  weekLabel: string;
  salesPeriodStart: string | null;
  salesPeriodEnd: string | null;
  sourceFileName?: string | null;
};

const SYSTEM_PROMPT = `너는 보험사 시상표를 구조화 JSON으로 변환하는 파서다.
- 추정으로 단정하지 말 것
- 읽기 어려운 값은 null 또는 불명확으로 둘 것
- 출력은 JSON 객체만 반환할 것
- 섹션별로 분리하고, tiers / exclusions / payout_policy / maintenance_policy / clawback_policy / logic_json을 분리할 것
- 금액은 원 단위 정수로 변환할 것`;

export async function parseCampaignImage(input: ParseInput) {
  const fallback = buildEmptyCampaignSchema({
    insurerCode: input.insurerCode,
    insurerName: input.insurerName,
    campaignName: input.campaignName,
    campaignYear: input.campaignYear,
    campaignMonth: input.campaignMonth,
    weekLabel: input.weekLabel,
    salesPeriodStart: input.salesPeriodStart,
    salesPeriodEnd: input.salesPeriodEnd,
  });

  fallback.source_meta.source_file_name = input.sourceFileName ?? "";

  if (!process.env.OPENAI_API_KEY || !input.imageDataUrl) {
    fallback.validation_flags = [
      ...buildValidationFlags(fallback),
      {
        level: "warning",
        field: "source_meta",
        message: "OPENAI 설정 또는 원본 이미지가 없어 기본 템플릿으로 생성했습니다.",
      },
    ];

    return {
      parsedJson: fallback,
      rawText: "",
    };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_PARSER_MODEL ?? "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `보험사=${input.insurerName}\n시상안명=${input.campaignName}\n연월=${input.campaignYear}-${String(
                input.campaignMonth,
              ).padStart(2, "0")}\n주차=${input.weekLabel}\n실적기간=${
                input.salesPeriodStart ?? ""
              } ~ ${input.salesPeriodEnd ?? ""}\n\n반드시 아래 구조를 포함해서 JSON으로 반환해줘:\n- schema_version\n- campaign_meta\n- source_meta\n- global_rules\n- sections[]\n- validation_flags[]`,
            },
            {
              type: "image_url",
              image_url: {
                url: input.imageDataUrl,
              },
            },
          ] as any,
        },
      ],
    });

    const rawText = completion.choices[0]?.message?.content ?? "{}";
    const parsed = normalizeIncentiveJson(JSON.parse(rawText), {
      insurerCode: input.insurerCode,
      insurerName: input.insurerName,
      campaignName: input.campaignName,
      campaignYear: input.campaignYear,
      campaignMonth: input.campaignMonth,
      weekLabel: input.weekLabel,
      salesPeriodStart: input.salesPeriodStart,
      salesPeriodEnd: input.salesPeriodEnd,
    });

    parsed.source_meta.source_file_name = input.sourceFileName ?? "";
    parsed.validation_flags = buildValidationFlags(parsed);

    return {
      parsedJson: parsed,
      rawText,
    };
  } catch (error) {
    fallback.validation_flags = [
      ...buildValidationFlags(fallback),
      {
        level: "warning",
        field: "source_meta.ai_model_name",
        message: `AI 분석 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      },
    ];

    return {
      parsedJson: fallback,
      rawText: "",
    };
  }
}
