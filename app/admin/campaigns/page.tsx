import Link from "next/link";

import { SetupNotice } from "@/components/admin/setup-notice";
import { getRecentCampaigns } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/env";

export default async function CampaignsPage() {
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
            등록된 시상안을 확인하고 검수 화면으로 이동합니다.
          </p>
        </div>
        <div className="page-actions">
          <Link className="button" href="/admin/campaigns/new">
            새 시상안 등록
          </Link>
        </div>
      </div>

      <div className="card">
        {campaigns.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>보험사</th>
                  <th>시상안</th>
                  <th>연월/주차</th>
                  <th>상태</th>
                  <th>생성일</th>
                  <th>열기</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.insurerName}</td>
                    <td>{campaign.campaignName}</td>
                    <td>
                      {campaign.campaignYear}.{campaign.campaignMonth} / {campaign.weekLabel}
                    </td>
                    <td>{campaign.status}</td>
                    <td>{new Date(campaign.createdAt).toLocaleString("ko-KR")}</td>
                    <td>
                      <Link className="button-secondary" href={`/admin/campaigns/${campaign.id}/review`}>
                        검수 화면
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">등록된 시상안이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
