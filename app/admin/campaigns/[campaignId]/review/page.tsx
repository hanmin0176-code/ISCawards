import { notFound } from "next/navigation";

import { ReviewWorkspace } from "@/components/admin/review-workspace";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getCampaignReviewData } from "@/lib/admin-data";
import { isOpenAIConfigured, isSupabaseConfigured } from "@/lib/env";

export default async function CampaignReviewPage({
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
    return (
      <div className="empty-state">
        아직 생성된 버전이 없습니다. 시상안을 다시 생성해 주세요.
      </div>
    );
  }

  return (
    <ReviewWorkspace
      campaign={data.campaign}
      version={data.version}
      imageUrl={data.imageUrl}
      openAIEnabled={isOpenAIConfigured()}
    />
  );
}
