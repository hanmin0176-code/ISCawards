import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type InsurerOption = {
  id: string;
  insurerCode: string;
  insurerName: string;
};

export type CampaignListItem = {
  id: string;
  campaignName: string;
  campaignYear: number;
  campaignMonth: number;
  weekLabel: string;
  status: string;
  salesPeriodStart: string | null;
  salesPeriodEnd: string | null;
  insurerName: string;
  activeVersionId: string | null;
  createdAt: string;
};

export type DashboardStats = {
  campaignCount: number;
  reviewQueueCount: number;
  publishedVersionCount: number;
  pendingMaintenanceCount: number;
};

export type CampaignReviewData = {
  campaign: {
    id: string;
    campaignName: string;
    campaignYear: number;
    campaignMonth: number;
    weekLabel: string;
    salesPeriodStart: string | null;
    salesPeriodEnd: string | null;
    status: string;
    insurerId: string;
    insurerName: string;
    insurerCode: string;
  };
  version: {
    id: string;
    versionNo: number;
    status: string;
    sourceFilePath: string | null;
    sourceFileName: string | null;
    aiParsedJson: any;
    approvedJson: any;
    validationResultJson: any;
    publishedAt: string | null;
    updatedAt: string;
    changeNote: string | null;
  } | null;
  imageUrl: string | null;
};

export async function getInsurers(): Promise<InsurerOption[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("insurers")
    .select("id, insurer_code, insurer_name")
    .order("insurer_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    insurerCode: item.insurer_code,
    insurerName: item.insurer_name,
  }));
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  const [campaignCountRes, reviewQueueRes, publishedRes, pendingMaintenanceRes] =
    await Promise.all([
      supabase.from("incentive_campaigns").select("id", { count: "exact", head: true }),
      supabase
        .from("incentive_campaign_versions")
        .select("id", { count: "exact", head: true })
        .in("status", ["draft", "reviewing", "ai_parsed", "approved"]),
      supabase
        .from("incentive_campaign_versions")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("reward_forecasts")
        .select("id", { count: "exact", head: true })
        .eq("forecast_status", "pending_maintenance"),
    ]);

  return {
    campaignCount: campaignCountRes.count ?? 0,
    reviewQueueCount: reviewQueueRes.count ?? 0,
    publishedVersionCount: publishedRes.count ?? 0,
    pendingMaintenanceCount: pendingMaintenanceRes.count ?? 0,
  };
}

export async function getRecentCampaigns(limit = 8): Promise<CampaignListItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = getSupabaseAdmin();
  const { data: campaigns, error } = await supabase
    .from("incentive_campaigns")
    .select(
      "id, insurer_id, campaign_name, campaign_year, campaign_month, week_label, status, sales_period_start, sales_period_end, active_version_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const insurerIds = Array.from(new Set((campaigns ?? []).map((item) => item.insurer_id)));
  const { data: insurers } = insurerIds.length
    ? await supabase
        .from("insurers")
        .select("id, insurer_name")
        .in("id", insurerIds)
    : { data: [] as { id: string; insurer_name: string }[] };

  const insurerMap = new Map((insurers ?? []).map((item) => [item.id, item.insurer_name]));

  return (campaigns ?? []).map((item) => ({
    id: item.id,
    campaignName: item.campaign_name,
    campaignYear: item.campaign_year,
    campaignMonth: item.campaign_month,
    weekLabel: item.week_label,
    status: item.status,
    salesPeriodStart: item.sales_period_start,
    salesPeriodEnd: item.sales_period_end,
    insurerName: insurerMap.get(item.insurer_id) ?? "미등록 보험사",
    activeVersionId: item.active_version_id,
    createdAt: item.created_at,
  }));
}

export async function getCampaignReviewData(
  campaignId: string,
): Promise<CampaignReviewData | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data: campaign, error: campaignError } = await supabase
    .from("incentive_campaigns")
    .select(
      "id, insurer_id, campaign_name, campaign_year, campaign_month, week_label, sales_period_start, sales_period_end, status",
    )
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    return null;
  }

  const { data: insurer } = await supabase
    .from("insurers")
    .select("id, insurer_code, insurer_name")
    .eq("id", campaign.insurer_id)
    .single();

  const { data: version } = await supabase
    .from("incentive_campaign_versions")
    .select(
      "id, version_no, status, source_file_path, source_file_name, ai_parsed_json, approved_json, validation_result_json, published_at, updated_at, change_note",
    )
    .eq("campaign_id", campaignId)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  let imageUrl: string | null = null;

  if (version?.source_file_path) {
    const { data: signedUrlData } = await supabase.storage
      .from("campaign-source-images")
      .createSignedUrl(version.source_file_path, 60 * 60);

    imageUrl = signedUrlData?.signedUrl ?? null;
  }

  return {
    campaign: {
      id: campaign.id,
      campaignName: campaign.campaign_name,
      campaignYear: campaign.campaign_year,
      campaignMonth: campaign.campaign_month,
      weekLabel: campaign.week_label,
      salesPeriodStart: campaign.sales_period_start,
      salesPeriodEnd: campaign.sales_period_end,
      status: campaign.status,
      insurerId: campaign.insurer_id,
      insurerName: insurer?.insurer_name ?? "미등록 보험사",
      insurerCode: insurer?.insurer_code ?? "",
    },
    version: version
      ? {
          id: version.id,
          versionNo: version.version_no,
          status: version.status,
          sourceFilePath: version.source_file_path,
          sourceFileName: version.source_file_name,
          aiParsedJson: version.ai_parsed_json,
          approvedJson: version.approved_json,
          validationResultJson: version.validation_result_json,
          publishedAt: version.published_at,
          updatedAt: version.updated_at,
          changeNote: version.change_note,
        }
      : null,
    imageUrl,
  };
}
