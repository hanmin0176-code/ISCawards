import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
  { params }: { params: { campaignId: string } },
) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: versions, error: versionError } = await supabase
      .from("incentive_campaign_versions")
      .select("id")
      .eq("campaign_id", params.campaignId);

    if (versionError) {
      return NextResponse.json({ error: versionError.message }, { status: 400 });
    }

    const versionIds = (versions ?? []).map((item) => item.id);

    if (versionIds.length > 0) {
      const { error: alertError } = await supabase
        .from("reward_alert_snapshots")
        .delete()
        .in("campaign_version_id", versionIds);

      if (alertError) {
        return NextResponse.json({ error: alertError.message }, { status: 400 });
      }

      const { error: forecastError } = await supabase
        .from("reward_forecasts")
        .delete()
        .in("campaign_version_id", versionIds);

      if (forecastError) {
        return NextResponse.json({ error: forecastError.message }, { status: 400 });
      }
    }

    const { error: deleteError } = await supabase
      .from("incentive_campaigns")
      .delete()
      .eq("id", params.campaignId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "시상안 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
