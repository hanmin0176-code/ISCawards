import { notFound } from "next/navigation";

import { RulesReviewWorkspaceV1 } from "@/components/admin/rules-review-workspace-v1";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getCampaignReviewData } from "@/lib/admin-data";
import { isOpenAIConfigured, isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function CampaignReviewRulesPage({
  params,
}: {
  params: { campaignId: string };
}) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const data = await getCampaignReviewData(params.campaignId);

  if (!data) {
    notFound();
  }

  if (!data.version) {
    return <div className="empty-state">아직 생성된 버전이 없습니다.</div>;
  }

  return (
    <RulesReviewWorkspaceV1
      campaign={data.campaign}
      version={data.version}
      imageUrl={data.imageUrl}
      openAIEnabled={isOpenAIConfigured()}
    />
  );
}
