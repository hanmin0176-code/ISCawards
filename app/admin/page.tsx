import Link from "next/link";

import { SetupNotice } from "@/components/admin/setup-notice";
import { StatCard } from "@/components/admin/stat-card";
import { getDashboardStats, getRecentCampaigns } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/env";

export default async function AdminDashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">대시보드</h1>
            <p className="page-description">환경변수 설정 후 관리자 화면이 실제 데이터와 연결됩니다.</p>
          </div>
        </div>
        <SetupNotice />
      </div>
    );
  }

  const [stats, recentCampaigns] = await Promise.all([
    getDashboardStats(),
    getRecentCampaigns(8),
  ]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">대시보드</h1>
          <p className="page-description">
            신규 시상표 등록, AI 분석, 검수, 배포까지 한 화면 흐름으로 관리합니다.
          </p>
        </div>
        <div className="page-actions">
          <Link className="button-secondary" href="/admin/campaigns">
            시상안 목록
          </Link>
          <Link className="button" href="/admin/campaigns/new">
            새 시상안 등록
          </Link>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 18 }}>
        <StatCard
          label="총 시상안"
          value={stats?.campaignCount ?? 0}
          hint="보험사/연월/주차 단위 등록 수"
        />
        <StatCard
          label="검수 대기 버전"
          value={stats?.reviewQueueCount ?? 0}
          hint="draft, reviewing, ai_parsed, approved 상태"
        />
        <StatCard
          label="배포 완료 버전"
          value={stats?.publishedVersionCount ?? 0}
          hint="실제 계산 엔진이 사용하는 버전 수"
        />
        <StatCard
          label="13회차 대기 건"
          value={stats?.pendingMaintenanceCount ?? 0}
          hint="pending_maintenance 상태의 예상 시상"
        />
      </div>

      <div className="card">
        <h2 className="card-title">최근 시상안</h2>
        <p className="card-description">
          가장 최근에 등록된 시상안을 바로 검수 화면으로 열 수 있습니다.
        </p>

        {recentCampaigns.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>보험사</th>
                  <th>시상안</th>
                  <th>연월/주차</th>
                  <th>상태</th>
                  <th>실적기간</th>
                  <th>열기</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.insurerName}</td>
                    <td>{campaign.campaignName}</td>
                    <td>
                      {campaign.campaignYear}.{campaign.campaignMonth} / {campaign.weekLabel}
                    </td>
                    <td>{campaign.status}</td>
                    <td>
                      {campaign.salesPeriodStart ?? "-"} ~ {campaign.salesPeriodEnd ?? "-"}
                    </td>
                    <td>
                      <Link className="button-secondary" href={`/admin/campaigns/${campaign.id}/review`}>
                        검수
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">아직 등록된 시상안이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
