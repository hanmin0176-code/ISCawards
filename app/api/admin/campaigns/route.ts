import { NextResponse } from "next/server";

import { buildEmptyCampaignSchema } from "@/lib/incentive-schema";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      insurerId,
      campaignYear,
      campaignMonth,
      weekLabel,
      campaignName,
      salesPeriodStart,
      salesPeriodEnd,
    } = body ?? {};

    if (!insurerId || !campaignYear || !campaignMonth || !weekLabel || !campaignName) {
      return NextResponse.json(
        { error: "필수값이 누락되었습니다." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: insurer, error: insurerError } = await supabase
      .from("insurers")
      .select("id, insurer_code, insurer_name")
      .eq("id", insurerId)
      .single();

    if (insurerError || !insurer) {
      return NextResponse.json(
        { error: "보험사 정보를 찾지 못했습니다." },
        { status: 404 },
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("incentive_campaigns")
      .insert({
        insurer_id: insurerId,
        campaign_year: campaignYear,
        campaign_month: campaignMonth,
        week_label: weekLabel,
        campaign_name: campaignName,
        sales_period_start: salesPeriodStart,
        sales_period_end: salesPeriodEnd,
        status: "draft",
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: campaignError?.message ?? "시상안 생성에 실패했습니다." },
        { status: 400 },
      );
    }

    const initialSchema = buildEmptyCampaignSchema({
      insurerCode: insurer.insurer_code,
      insurerName: insurer.insurer_name,
      campaignName,
      campaignYear,
      campaignMonth,
      weekLabel,
      salesPeriodStart,
      salesPeriodEnd,
    });

    const { data: version, error: versionError } = await supabase
      .from("incentive_campaign_versions")
      .insert({
        campaign_id: campaign.id,
        version_no: 1,
        status: "draft",
        ai_parsed_json: initialSchema,
        approved_json: initialSchema,
        validation_result_json: initialSchema.validation_flags,
      })
      .select("id")
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        { error: versionError?.message ?? "버전 생성에 실패했습니다." },
        { status: 400 },
      );
    }

    await supabase.from("campaign_review_logs").insert({
      version_id: version.id,
      action_type: "create",
      action_note: "시상안 초안 생성",
      after_json: initialSchema,
    });

    return NextResponse.json({
      campaignId: campaign.id,
      versionId: version.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "시상안 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
