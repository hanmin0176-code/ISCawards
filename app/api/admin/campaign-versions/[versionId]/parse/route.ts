import { NextResponse } from "next/server";

import { buildEmptyCampaignSchema, buildValidationFlags } from "@/lib/incentive-schema";
import { parseCampaignImage } from "@/lib/openai/parse-campaign-image";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: { versionId: string } },
) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: version, error: versionError } = await supabase
      .from("incentive_campaign_versions")
      .select("id, campaign_id, source_file_path, source_file_name")
      .eq("id", params.versionId)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: "버전 정보를 찾지 못했습니다." }, { status: 404 });
    }

    const { data: campaign } = await supabase
      .from("incentive_campaigns")
      .select(
        "id, insurer_id, campaign_name, campaign_year, campaign_month, week_label, sales_period_start, sales_period_end",
      )
      .eq("id", version.campaign_id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: "시상안 정보를 찾지 못했습니다." }, { status: 404 });
    }

    const { data: insurer } = await supabase
      .from("insurers")
      .select("insurer_code, insurer_name")
      .eq("id", campaign.insurer_id)
      .single();

    const fallback = buildEmptyCampaignSchema({
      insurerCode: insurer?.insurer_code,
      insurerName: insurer?.insurer_name,
      campaignName: campaign.campaign_name,
      campaignYear: campaign.campaign_year,
      campaignMonth: campaign.campaign_month,
      weekLabel: campaign.week_label,
      salesPeriodStart: campaign.sales_period_start,
      salesPeriodEnd: campaign.sales_period_end,
    });

    let imageDataUrl: string | null = null;

    if (version.source_file_path) {
      const { data: imageBlob, error: downloadError } = await supabase.storage
        .from("campaign-source-images")
        .download(version.source_file_path);

      if (downloadError) {
        return NextResponse.json({ error: downloadError.message }, { status: 400 });
      }

      const arrayBuffer = await imageBlob.arrayBuffer();
      const mimeType = imageBlob.type || "image/png";
      imageDataUrl = `data:${mimeType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
    }

    const { parsedJson, rawText } = await parseCampaignImage({
      imageDataUrl,
      insurerCode: insurer?.insurer_code ?? "",
      insurerName: insurer?.insurer_name ?? "",
      campaignName: campaign.campaign_name,
      campaignYear: campaign.campaign_year,
      campaignMonth: campaign.campaign_month,
      weekLabel: campaign.week_label,
      salesPeriodStart: campaign.sales_period_start,
      salesPeriodEnd: campaign.sales_period_end,
      sourceFileName: version.source_file_name,
    });

    const validationFlags = buildValidationFlags(parsedJson);
    const mergedPayload = {
      ...parsedJson,
      validation_flags: validationFlags.length > 0 ? validationFlags : fallback.validation_flags,
    };

    const { error: updateError } = await supabase
      .from("incentive_campaign_versions")
      .update({
        ai_parsed_json: mergedPayload,
        raw_ocr_text: rawText,
        validation_result_json: mergedPayload.validation_flags,
        status: "ai_parsed",
      })
      .eq("id", params.versionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await supabase.from("campaign_review_logs").insert({
      version_id: params.versionId,
      action_type: "parse",
      action_note: "시상표 분석 수행",
      after_json: mergedPayload,
    });

    return NextResponse.json({ aiParsedJson: mergedPayload });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
