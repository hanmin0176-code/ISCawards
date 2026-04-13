import { notFound } from "next/navigation";
import Link from "next/link";

import { CampaignListTableV2 } from "@/components/admin/campaign-list-table-v2";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getRecentCampaigns } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/env";

export default async function RewrittenCampaignsPage({
  params,
}: {
  params: { segment: string };
}) {
  if (params.segment !== "_internal") {
    notFound();
  }

  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const campaigns = await getRecentCampaigns(50);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">시상안 목록</h1>
          <p className="page-description">
            등록된 시상안을 확인하고 최신 검수 화면으로 열거나, 불필요한 시상안을 삭제합니다.
          </p>
        </div>
        <div className="page-actions">
          <Link className="button" href="/admin/campaigns/new">
            새 시상안 등록
          </Link>
        </div>
      </div>

      <div className="card">
        <CampaignListTableV2 initialCampaigns={campaigns} />
      </div>
    </div>
  );
}
