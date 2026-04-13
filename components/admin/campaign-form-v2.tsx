'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InsurerOption = {
  id: string;
  insurerName: string;
};

type CampaignFormV2Props = {
  insurers: InsurerOption[];
};

function buildCampaignName(insurerName: string, year: number, month: number, weekLabel: string) {
  const shortYear = String(year).slice(-2);
  return `${shortYear}.${month}월 ${weekLabel} ${insurerName} 시상`;
}

export function CampaignFormV2({ insurers }: CampaignFormV2Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [insurerId, setInsurerId] = useState(insurers[0]?.id ?? "");
  const [campaignYear, setCampaignYear] = useState<number>(new Date().getFullYear());
  const [campaignMonth, setCampaignMonth] = useState<number>(new Date().getMonth() + 1);
  const [weekLabel, setWeekLabel] = useState("1주차");
  const [salesPeriodStart, setSalesPeriodStart] = useState("");
  const [salesPeriodEnd, setSalesPeriodEnd] = useState("");

  const selectedInsurerName =
    insurers.find((insurer) => insurer.id === insurerId)?.insurerName ?? "보험사";

  const campaignName = useMemo(
    () => buildCampaignName(selectedInsurerName, campaignYear, campaignMonth, weekLabel),
    [campaignMonth, campaignYear, selectedInsurerName, weekLabel],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          insurerId,
          campaignYear,
          campaignMonth,
          weekLabel,
          campaignName,
          salesPeriodStart: salesPeriodStart || null,
          salesPeriodEnd: salesPeriodEnd || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "시상안 생성에 실패했습니다.");
      }

      setMessage("시상안이 생성되었습니다. 최신 검수 화면으로 이동합니다.");
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
        보험사가 아직 등록되지 않았습니다. 먼저 <code>insurers</code> 테이블에 보험사 데이터를 넣어주세요.
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">신규 시상안 등록</h2>
      <p className="card-description">
        보험사, 연도, 월, 주차를 선택하면 시상안 이름이 자동으로 만들어집니다.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div>
            <label className="field-label" htmlFor="insurerId">
              보험사
            </label>
            <select
              className="select"
              id="insurerId"
              value={insurerId}
              onChange={(event) => setInsurerId(event.target.value)}
              required
            >
              {insurers.map((insurer) => (
                <option key={insurer.id} value={insurer.id}>
                  {insurer.insurerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="campaignNamePreview">
              시상안 이름(자동 생성)
            </label>
            <input className="input" id="campaignNamePreview" value={campaignName} readOnly />
          </div>

          <div>
            <label className="field-label" htmlFor="campaignYear">
              연도
            </label>
            <input
              className="input"
              id="campaignYear"
              type="number"
              value={campaignYear}
              onChange={(event) => setCampaignYear(Number(event.target.value))}
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
              type="number"
              min={1}
              max={12}
              value={campaignMonth}
              onChange={(event) => setCampaignMonth(Number(event.target.value))}
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
              value={weekLabel}
              onChange={(event) => setWeekLabel(event.target.value)}
              placeholder="예: 2주차"
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="salesPeriodStart">
              실적 시작일
            </label>
            <input
              className="input"
              id="salesPeriodStart"
              type="date"
              value={salesPeriodStart}
              onChange={(event) => setSalesPeriodStart(event.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="salesPeriodEnd">
              실적 종료일
            </label>
            <input
              className="input"
              id="salesPeriodEnd"
              type="date"
              value={salesPeriodEnd}
              onChange={(event) => setSalesPeriodEnd(event.target.value)}
            />
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
