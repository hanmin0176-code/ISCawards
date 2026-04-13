import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { extractRuleDrafts, validateRuleDrafts } from "@/lib/rule-drafts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(
  request: Request,
  { params }: { params: { versionId: string } },
) {
  try {
    const body = await request.json();
    const approvedJson = body?.approvedJson;

    if (!isRecord(approvedJson)) {
      return NextResponse.json({ error: "승인 JSON이 비어 있습니다." }, { status: 400 });
    }

    const ruleDrafts = extractRuleDrafts(approvedJson).filter((rule) => !rule.isTemplate);
    const validationFlags = validateRuleDrafts(ruleDrafts);

    const nextPayload = {
      ...approvedJson,
      validation_flags: validationFlags,
    };

    const supabase = getSupabaseAdmin();
    const { data: beforeVersion } = await supabase
      .from("incentive_campaign_versions")
      .select("approved_json")
      .eq("id", params.versionId)
      .single();

    const { error: updateError } = await supabase
      .from("incentive_campaign_versions")
      .update({
        approved_json: nextPayload,
        validation_result_json: validationFlags,
        status: "approved",
      })
      .eq("id", params.versionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await supabase.from("campaign_review_logs").insert({
      version_id: params.versionId,
      action_type: "approve_rules",
      action_note: "규칙 카드 기반 승인 JSON 저장",
      before_json: beforeVersion?.approved_json ?? null,
      after_json: nextPayload,
    });

    return NextResponse.json({ ok: true, validationFlags });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "규칙 저장 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
