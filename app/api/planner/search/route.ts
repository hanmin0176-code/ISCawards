import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { parsePlannerSearchQuery } from "@/lib/planner-search";
import { extractRuleDrafts, serializeRuleDrafts } from "@/lib/rule-drafts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "검색어를 입력해 주세요." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: insurers, error: insurerError } = await supabase
      .from("insurers")
      .select("id, insurer_name");

    if (insurerError) {
      return NextResponse.json({ error: insurerError.message }, { status: 400 });
    }

    const parsed = parsePlannerSearchQuery(
      query,
      (insurers ?? []).map((item) => item.insurer_name),
    );

    let insurerId: string | null = null;
    if (parsed.insurerName) {
      insurerId = (insurers ?? []).find((item) => item.insurer_name === parsed.insurerName)?.id ?? null;
    }

    let campaignQuery = supabase
      .from("incentive_campaigns")
      .select(
        "id, insurer_id, campaign_name, campaign_year, campaign_month, week_label, sales_period_start, sales_period_end, active_version_id, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (insurerId) {
      campaignQuery = campaignQuery.eq("insurer_id", insurerId);
    }
    if (parsed.year) {
      campaignQuery = campaignQuery.eq("campaign_year", parsed.year);
    }
    if (parsed.month) {
      campaignQuery = campaignQuery.eq("campaign_month", parsed.month);
    }
    if (parsed.weekLabel) {
      campaignQuery = campaignQuery.eq("week_label", parsed.weekLabel);
    }

    let { data: campaigns, error: campaignError } = await campaignQuery;

    if (campaignError) {
      return NextResponse.json({ error: campaignError.message }, { status: 400 });
    }

    if (!campaigns || campaigns.length === 0) {
      const fallback = await supabase
        .from("incentive_campaigns")
        .select(
          "id, insurer_id, campaign_name, campaign_year, campaign_month, week_label, sales_period_start, sales_period_end, active_version_id, created_at",
        )
        .ilike("campaign_name", `%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      campaigns = fallback.data ?? [];
      campaignError = fallback.error ?? null;
    }

    if (campaignError) {
      return NextResponse.json({ error: campaignError.message }, { status: 400 });
    }

    const results = [] as unknown[];

    for (const campaign of campaigns ?? []) {
      const { data: insurer } = await supabase
        .from("insurers")
        .select("insurer_name, insurer_code")
        .eq("id", campaign.insurer_id)
        .single();

      let version = null as Record<string, unknown> | null;
      if (campaign.active_version_id) {
        const versionResult = await supabase
          .from("incentive_campaign_versions")
          .select(
            "id, version_no, status, source_file_path, source_file_name, approved_json, ai_parsed_json, published_at",
          )
          .eq("id", campaign.active_version_id)
          .maybeSingle();
        version = versionResult.data as Record<string, unknown> | null;
      }

      if (!version) {
        const versionResult = await supabase
          .from("incentive_campaign_versions")
          .select(
            "id, version_no, status, source_file_path, source_file_name, approved_json, ai_parsed_json, published_at",
          )
          .eq("campaign_id", campaign.id)
          .order("version_no", { ascending: false })
          .limit(1)
          .maybeSingle();
        version = versionResult.data as Record<string, unknown> | null;
      }

      let imageUrl: string | null = null;
      if (version && typeof version.source_file_path === "string" && version.source_file_path) {
        const signedUrlResult = await supabase.storage
          .from("campaign-source-images")
          .createSignedUrl(version.source_file_path, 60 * 60);
        imageUrl = signedUrlResult.data?.signedUrl ?? null;
      }

      const payload = isRecord(version?.approved_json)
        ? version?.approved_json
        : isRecord(version?.ai_parsed_json)
          ? version?.ai_parsed_json
          : {};

      const rules = extractRuleDrafts(payload).filter((rule) => !rule.isTemplate);

      results.push({
        campaign: {
          id: campaign.id,
          campaignName: campaign.campaign_name,
          campaignYear: campaign.campaign_year,
          campaignMonth: campaign.campaign_month,
          weekLabel: campaign.week_label,
          salesPeriodStart: campaign.sales_period_start,
          salesPeriodEnd: campaign.sales_period_end,
          insurerName: insurer?.insurer_name ?? "미등록 보험사",
          insurerCode: insurer?.insurer_code ?? "",
        },
        version: version
          ? {
              id: version.id,
              versionNo: version.version_no,
              status: version.status,
              sourceFileName: version.source_file_name,
              publishedAt: version.published_at,
            }
          : null,
        imageUrl,
        rules,
        rawRules: serializeRuleDrafts(rules),
      });
    }

    return NextResponse.json({
      parsed,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "검색 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
