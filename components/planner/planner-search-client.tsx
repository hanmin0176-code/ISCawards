'use client';

import { useMemo, useState } from "react";

import {
  calculateQuickEstimates,
  type QuickCalculationResult,
  type RuleDraft,
} from "@/lib/rule-drafts";

type SearchResult = {
  campaign: {
    id: string;
    campaignName: string;
    campaignYear: number;
    campaignMonth: number;
    weekLabel: string;
    salesPeriodStart: string | null;
    salesPeriodEnd: string | null;
    insurerName: string;
    insurerCode: string;
  };
  version: {
    id: string;
    versionNo: number;
    status: string;
    sourceFileName: string | null;
    publishedAt: string | null;
  } | null;
  imageUrl: string | null;
  rules: RuleDraft[];
};

type SearchApiResponse = {
  parsed: {
    insurerName: string | null;
    year: number | null;
    month: number | null;
    weekLabel: string | null;
  };
  results: SearchResult[];
};

function formatRuleType(ruleType: RuleDraft["ruleType"]) {
  if (ruleType === "percentage_payout") return "퍼센트형";
  if (ruleType === "tiered_cash_next_month") return "익월 구간형";
  if (ruleType === "tiered_cash_after_13th") return "13회차 구간형";
  if (ruleType === "consecutive_bonus") return "연속가동형";
  return "여행 / 택1";
}

function RuleCard({ rule }: { rule: RuleDraft }) {
  return (
    <div className="info-item">
      <div className="inline-group" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{rule.ruleName || "무제 규칙"}</strong>
        <span className="badge">{formatRuleType(rule.ruleType)}</span>
      </div>
      <div className="field-help" style={{ marginBottom: 8 }}>{rule.description || "설명 없음"}</div>
      <div className="field-help">지급시점: {rule.payoutTimingType}</div>
      {rule.targetInclude.length > 0 ? <div className="field-help">대상: {rule.targetInclude.join(", ")}</div> : null}
      {rule.targetExclude.length > 0 ? <div className="field-help">제외: {rule.targetExclude.join(", ")}</div> : null}
      {rule.percentageTotal ? <div className="field-help">퍼센트: {rule.percentageTotal}%</div> : null}
      {rule.tiers.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          {rule.tiers.map((tier, index) => (
            <div key={`${rule.ruleCode}-tier-${index}`} className="field-help">
              {tier.thresholdValue?.toLocaleString("ko-KR") ?? "-"}원 → {tier.rewardCashAmount?.toLocaleString("ko-KR") ?? "-"}원
            </div>
          ))}
        </div>
      ) : null}
      {rule.notes.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          {rule.notes.map((note) => (
            <div key={note} className="field-help">- {note}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QuickCalculator({ rules }: { rules: RuleDraft[] }) {
  const [productGroup, setProductGroup] = useState("인보험");
  const [metricType, setMetricType] = useState("performance_amount");
  const [amount, setAmount] = useState<number>(300000);

  const estimates = useMemo<QuickCalculationResult[]>(
    () => calculateQuickEstimates(rules, { productGroup, metricType, amount }),
    [amount, metricType, productGroup, rules],
  );

  return (
    <div className="card">
      <h3 className="card-title">간단 계산기</h3>
      <p className="card-description">
        인보험/펫/캣/The라이프업 등 상품군과 금액을 넣으면 즉시 계산 가능한 규칙만 먼저 보여줍니다.
      </p>
      <div className="form-grid">
        <div>
          <label className="field-label">상품군</label>
          <select className="select" value={productGroup} onChange={(event) => setProductGroup(event.target.value)}>
            <option value="인보험">인보험</option>
            <option value="펫보험">펫보험</option>
            <option value="캣보험">캣보험</option>
            <option value="The라이프업보험">The라이프업보험</option>
            <option value="기타">기타</option>
          </select>
        </div>
        <div>
          <label className="field-label">계산 기준</label>
          <select className="select" value={metricType} onChange={(event) => setMetricType(event.target.value)}>
            <option value="performance_amount">실적금액</option>
            <option value="monthly_premium">월납보험료</option>
          </select>
        </div>
        <div>
          <label className="field-label">금액</label>
          <input className="input" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value) || 0)} />
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {estimates.length > 0 ? (
          estimates.map((estimate) => (
            <div key={`${estimate.ruleCode}-${estimate.rewardText}`} className="info-item">
              <div className="inline-group" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <strong>{estimate.ruleName}</strong>
                <span className="badge">{estimate.payoutTimingType}</span>
              </div>
              <div className="info-value">{estimate.rewardText}</div>
              {estimate.matchedTierLabel ? <div className="field-help">적용 구간: {estimate.matchedTierLabel}</div> : null}
              {estimate.note ? <div className="field-help">{estimate.note}</div> : null}
            </div>
          ))
        ) : (
          <div className="empty-state">
            현재 입력값으로 즉시 계산 가능한 규칙이 없습니다. 여행/연속가동 시상은 조건형이라 카드 내용을 함께 확인하세요.
          </div>
        )}
      </div>
    </div>
  );
}

export function PlannerSearchClient() {
  const [query, setQuery] = useState("2026년 4월 2주차 삼성화재 시상안");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [parsed, setParsed] = useState<SearchApiResponse["parsed"] | null>(null);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/planner/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const result = (await response.json()) as SearchApiResponse & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "검색에 실패했습니다.");
      }

      setParsed(result.parsed);
      setResults(result.results ?? []);
      if ((result.results ?? []).length === 0) {
        setMessage("검색 결과가 없습니다. 보험사명/연월/주차를 다시 확인해 주세요.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "검색 중 오류가 발생했습니다.");
      setResults([]);
      setParsed(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">시상안 조회 / 간단 계산</h1>
          <p className="page-description">
            설계사가 자연어로 시상안을 검색하고, 결과 이미지와 규칙 카드, 간단 계산기를 함께 볼 수 있는 화면입니다.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <form onSubmit={handleSearch}>
          <div className="form-grid">
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">검색어</label>
              <input
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="예: 2026년 4월 2주차 삼성화재 시상안"
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "검색 중..." : "검색"}
            </button>
          </div>
        </form>

        {parsed ? (
          <div className="status-line success">
            해석 결과: {parsed.insurerName ?? "보험사 미확정"} / {parsed.year ?? "연도 미확정"}년 / {parsed.month ?? "월 미확정"}월 / {parsed.weekLabel ?? "주차 미확정"}
          </div>
        ) : null}
        {message ? <div className="status-line">{message}</div> : null}
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {results.map((item) => (
          <div key={item.campaign.id} className="card">
            <div className="page-header" style={{ marginBottom: 12 }}>
              <div>
                <h2 className="card-title" style={{ marginBottom: 6 }}>{item.campaign.campaignName}</h2>
                <div className="field-help">
                  {item.campaign.insurerName} / {item.campaign.campaignYear}.{item.campaign.campaignMonth} / {item.campaign.weekLabel}
                </div>
                <div className="field-help">
                  실적 기간: {item.campaign.salesPeriodStart ?? "-"} ~ {item.campaign.salesPeriodEnd ?? "-"}
                </div>
              </div>
              {item.version ? <span className="badge">v{item.version.versionNo}</span> : null}
            </div>

            <div className="review-grid" style={{ gridTemplateColumns: "minmax(320px, 40%) minmax(0, 1fr)" }}>
              <div>
                <div className="image-box">
                  {item.imageUrl ? <img alt="시상표 원본" src={item.imageUrl} /> : <div className="empty-state" style={{ width: "100%" }}>등록된 시상 이미지가 없습니다.</div>}
                </div>
              </div>
              <div style={{ display: "grid", gap: 16 }}>
                <div className="card" style={{ padding: 14 }}>
                  <h3 className="card-title">규칙 카드</h3>
                  <p className="card-description">확정된 규칙 또는 AI 초안 기반 규칙 요약입니다.</p>
                  <div style={{ display: "grid", gap: 10 }}>
                    {item.rules.length > 0 ? item.rules.map((rule) => <RuleCard key={rule.ruleCode} rule={rule} />) : <div className="empty-state">규칙 데이터가 없습니다.</div>}
                  </div>
                </div>
                <QuickCalculator rules={item.rules} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
