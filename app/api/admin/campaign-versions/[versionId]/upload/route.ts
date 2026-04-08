import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(
  request: Request,
  { params }: { params: { versionId: string } },
) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "업로드 파일이 없습니다." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const safeFileName = sanitizeFileName(file.name);
    const filePath = `campaign-versions/${params.versionId}/${Date.now()}-${safeFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("campaign-source-images")
      .upload(filePath, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from("incentive_campaign_versions")
      .update({
        source_file_path: filePath,
        source_file_name: file.name,
        status: "reviewing",
      })
      .eq("id", params.versionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await supabase.from("campaign_review_logs").insert({
      version_id: params.versionId,
      action_type: "upload",
      action_note: "원본 시상표 이미지 업로드",
      after_json: {
        source_file_path: filePath,
        source_file_name: file.name,
      },
    });

    return NextResponse.json({ filePath, fileName: file.name });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
