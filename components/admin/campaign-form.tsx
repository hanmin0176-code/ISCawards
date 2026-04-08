'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";

type InsurerOption = {
  id: string;
  insurerName: string;
};

type CampaignFormProps = {
  insurers: InsurerOption[];
};

export function CampaignForm({ insurers }: CampaignFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          insurerId: formData.get("insurerId"),
          campaignYear: Number(formData.get("campaignYear")),
          campaignMonth: Number(formData.get("campaignMonth")),
          weekLabel: formData.get("weekLabel"),
          campaignName: formData.get("campaignName"),
          salesPeriodStart: formData.get("salesPeriodStart") || null,
          salesPeriodEnd: formData.get("salesPeriodEnd") || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "시상안 생성에 실패했습니다.");
      }

      setMessage("시상안이 생성되었습니다. 검수 화면으로 이동합니다.");
      router.push(`/admin/campaigns/${result.campaignId}/review`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (insurers.length === 0) {
    return (
      <div className="empty-state">
        보험사가 아직 등록되지 않았습니다. 먼저 <code>insurers</code> 테이블에 보험사 데이터를
        넣어주세요.
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">신규 시상안 등록</h2>
      <p className="card-description">
        보험사, 연월, 주차를 등록하면 초안 버전 1이 함께 생성됩니다.
      </p>
      <form action={handleSubmit}>
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor="insurerId">
              보험사
            </label>
            <select className="select" id="insurerId" name="insurerId" required>
              {insurers.map((insurer) => (
                <option key={insurer.id} value={insurer.id}>
                  {insurer.insurerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="campaignName">
              시상안 이름
            </label>
            <input
              className="input"
              id="campaignName"
              name="campaignName"
              placeholder="예: 26.4월 2주차 삼성화재 시상"
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="campaignYear">
              연도
            </label>
            <input
              className="input"
              id="campaignYear"
              name="campaignYear"
              type="number"
              defaultValue={new Date().getFullYear()}
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="campaignMonth">
              월
            </label>
            <input
              className="input"
              id="campaignMonth"
              name="campaignMonth"
              type="number"
              min={1}
              max={12}
              defaultValue={new Date().getMonth() + 1}
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="weekLabel">
              주차 라벨
            </label>
            <input
              className="input"
              id="weekLabel"
              name="weekLabel"
              placeholder="예: 2주차"
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="salesPeriodStart">
              실적 시작일
            </label>
            <input className="input" id="salesPeriodStart" name="salesPeriodStart" type="date" />
          </div>

          <div>
            <label className="field-label" htmlFor="salesPeriodEnd">
              실적 종료일
            </label>
            <input className="input" id="salesPeriodEnd" name="salesPeriodEnd" type="date" />
          </div>
        </div>

        <div className="form-actions">
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "생성 중..." : "시상안 생성"}
          </button>
        </div>

        {message ? <div className="status-line">{message}</div> : null}
      </form>
    </div>
  );
}
