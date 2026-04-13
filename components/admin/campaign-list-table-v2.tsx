'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CampaignListItem = {
  id: string;
  campaignName: string;
  campaignYear: number;
  campaignMonth: number;
  weekLabel: string;
  status: string;
  insurerName: string;
  createdAt: string;
};

type CampaignListTableV2Props = {
  initialCampaigns: CampaignListItem[];
};

export function CampaignListTableV2({ initialCampaigns }: CampaignListTableV2Props) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDelete(campaignId: string) {
    const confirmed = window.confirm("이 시상안을 삭제하시겠습니까? 관련 버전과 업로드 데이터도 함께 삭제됩니다.");
    if (!confirmed) return;

    setBusyId(campaignId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "시상안 삭제에 실패했습니다.");
      }

      setCampaigns((prev) => prev.filter((campaign) => campaign.id !== campaignId));
      setMessage("시상안이 삭제되었습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  if (campaigns.length === 0) {
    return <div className="empty-state">등록된 시상안이 없습니다.</div>;
  }

  return (
    <div>
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
              <th>삭제</th>
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
                <td>
                  <button
                    className="button-danger"
                    type="button"
                    disabled={busyId === campaign.id}
                    onClick={() => handleDelete(campaign.id)}
                  >
                    {busyId === campaign.id ? "삭제 중..." : "삭제"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message ? <div className="status-line">{message}</div> : null}
    </div>
  );
}
