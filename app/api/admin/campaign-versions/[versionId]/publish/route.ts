import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: { versionId: string } },
) {
  try {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.rpc("publish_campaign_version", {
      p_version_id: params.versionId,
      p_actor_user_id: null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "배포 처리 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
