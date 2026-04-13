'use client';

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  extractRuleDrafts,
  serializeRuleDrafts,
  validateRuleDrafts,
  type RuleDraft,
  type RuleType,
} from "@/lib/rule-drafts";

type RulesReviewWorkspaceProps = {
  campaign: {
    id: string;
    campaignName: string;
    campaignYear: number;
    campaignMonth: number;
    weekLabel: string;
    salesPeriodStart: string | null;
    salesPeriodEnd: string | null;
    insurerName: string;
    status: string;
  };
  version: {
    id: string;
    versionNo: number;
    status: string;
    sourceFileName: string | null;
    aiParsedJson: unknown;
    approvedJson: unknown;
    publishedAt: string | null;
  };
  imageUrl: string | null;
  openAIEnabled: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStatusBadgeClass(status: string) {
  if (status === "published") return "badge success";
  if (status === "approved") return "badge";
  if (status === "ai_parsed") return "badge warning";
  return "badge";
}

function createBlankRule(ruleType: RuleType): RuleDraft {
  const base: RuleDraft = {
    ruleCode: `${ruleType}-${Date.now()}`,
    ruleType,
    ruleName: "",
    description: "",
    baseMetricType: ruleType === "percentage_payout" ? "monthly_premium" : "performance_amount",
    payoutTimingType:
      ruleType === "tiered_cash_after_13th"
        ? "after_13th"
        : ruleType === "consecutive_bonus"
          ? "after_maintenance"
          : ruleType === "trip_or_choice_reward"
            ? "custom"
            : "next_month",
    payoutOffsetMonths: ruleType === "tiered_cash_next_month" || ruleType === "percentage_payout" ? 1 : null,
    maintenanceRequired: ruleType === "tiered_cash_after_13th" || ruleType === "consecutive_bonus",
    maintenanceRound: ruleType === "tiered_cash_after_13th" || ruleType === "consecutive_bonus" ? 13 : null,
    targetInclude: [],
    targetExclude: [],
    percentageTotal: null,
    percentageBreakdown: [],
    periods: [],
    tiers: [],
    conditionSets: [],
    rewardOptions: [],
    notes: [],
    isTemplate: false,
  };

  return base;
}

function parseBreakdownText(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, percent] = line.split(":");
      return {
        label: (label ?? "").trim(),
        percent: Number((percent ?? "0").trim()),
      };
    })
    .filter((item) => item.label && Number.isFinite(item.percent));
}

export function RulesReviewWorkspaceV1({
  campaign,
  version,
  imageUrl,
  openAIEnabled,
}: RulesReviewWorkspaceProps) {
  const router = useRouter();
  const basePayload = isRecord(version.approvedJson) && Object.keys(version.approvedJson).length > 0
    ? version.approvedJson
    : isRecord(version.aiParsedJson)
      ? version.aiParsedJson
      : {};

  const [payload, setPayload] = useState<Record<string, unknown>>(basePayload);
  const [rules, setRules] = useState<RuleDraft[]>(extractRuleDrafts(basePayload));
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl);
  const [fileName, setFileName] = useState(version.sourceFileName ?? "업로드 전");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"default" | "success" | "error">("default");
  const [isBusy, setIsBusy] = useState(false);
  const [rawJsonText, setRawJsonText] = useState(JSON.stringify(basePayload, null, 2));

  const validationFlags = useMemo(() => validateRuleDrafts(rules), [rules]);

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/admin/campaign-versions/${version.id}/upload`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error ?? "이미지 업로드에 실패했습니다.");
    }
  }

  async function runParse() {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/campaign-versions/${version.id}/parse`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "AI 분석에 실패했습니다.");
      }

      const nextPayload = isRecord(result.aiParsedJson) ? result.aiParsedJson : {};
      setPayload(nextPayload);
      setRules(extractRuleDrafts(nextPayload));
      setRawJsonText(JSON.stringify(nextPayload, null, 2));
      setMessage("AI 초안을 규칙 카드로 변환했습니다. 카드별로 수정 후 저장하세요.");
      setMessageTone("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "분석 중 오류가 발생했습니다.");
      setMessageTone("error");
    } finally {
      setIsBusy(false);
    }
  }

  function updateRule(index: number, updater: (rule: RuleDraft) => RuleDraft) {
    setRules((prev) => prev.map((rule, ruleIndex) => (ruleIndex === index ? updater(rule) : rule)));
  }

  function addRule(ruleType: RuleType) {
    setRules((prev) => [...prev, createBlankRule(ruleType)]);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, ruleIndex) => ruleIndex !== index));
  }

  async function saveRulesDraft() {
    setIsBusy(true);
    setMessage(null);

    try {
      const mergedPayload = {
        ...payload,
        rules: serializeRuleDrafts(rules),
        validation_flags: validationFlags,
      };

      const response = await fetch(`/api/admin/campaign-versions/${version.id}/save-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedJson: mergedPayload }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "규칙 저장에 실패했습니다.");
      }

      setPayload(mergedPayload);
      setRawJsonText(JSON.stringify(mergedPayload, null, 2));
      setMessage("규칙 카드가 승인 JSON으로 저장되었습니다.");
      setMessageTone("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "규칙 저장 중 오류가 발생했습니다.");
      setMessageTone("error");
    } finally {
      setIsBusy(false);
    }
  }

  async function saveRawJson() {
    setIsBusy(true);
    setMessage(null);

    try {
      const parsed = JSON.parse(rawJsonText) as Record<string, unknown>;
      const response = await fetch(`/api/admin/campaign-versions/${version.id}/save-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedJson: parsed }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "JSON 저장에 실패했습니다.");
      }

      setPayload(parsed);
      setRules(extractRuleDrafts(parsed));
      setMessage("승인 JSON이 저장되었습니다.");
      setMessageTone("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON 형식이 올바르지 않습니다.");
      setMessageTone("error");
    } finally {
      setIsBusy(false);
    }
  }

  async function publishVersion() {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/campaign-versions/${version.id}/publish`, {
        method: "POST",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "배포에 실패했습니다.");
      }

      setMessage("현재 버전이 배포 확정되었습니다.");
      setMessageTone("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "배포 처리 중 오류가 발생했습니다.");
      setMessageTone("error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">규칙 카드 편집 검수</h1>
          <p className="page-description">
            AI 초안은 참고만 하고, 실제 계산에 사용할 규칙은 아래 카드에서 확정합니다.
          </p>
        </div>
        <div className="page-actions">
          <span className={getStatusBadgeClass(version.status)}>{version.status}</span>
          <span className="badge">v{version.versionNo}</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">보험사</div>
            <div className="info-value">{campaign.insurerName}</div>
          </div>
          <div className="info-item">
            <div className="info-label">시상안</div>
            <div className="info-value">{campaign.campaignName}</div>
          </div>
          <div className="info-item">
            <div className="info-label">연월 / 주차</div>
            <div className="info-value">{campaign.campaignYear}.{campaign.campaignMonth} / {campaign.weekLabel}</div>
          </div>
          <div className="info-item">
            <div className="info-label">실적 기간</div>
            <div className="info-value">{campaign.salesPeriodStart ?? "미입력"} ~ {campaign.salesPeriodEnd ?? "미입력"}</div>
          </div>
        </div>
      </div>

      <div className="review-grid">
        <div className="card">
          <h2 className="card-title">원본 시상표</h2>
          <p className="card-description">업로드 후 AI 분석을 실행하면 규칙 카드 초안이 갱신됩니다.</p>
          <div className="inline-group" style={{ marginBottom: 16 }}>
            <label className="button-secondary" style={{ cursor: "pointer" }}>
              이미지 업로드
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;

                  setIsBusy(true);
                  setMessage(null);
                  const localPreviewUrl = URL.createObjectURL(file);
                  setPreviewUrl(localPreviewUrl);
                  setFileName(file.name);

                  try {
                    await uploadImage(file);
                    setMessage("원본 이미지가 업로드되었습니다.");
                    setMessageTone("success");
                    router.refresh();
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.");
                    setMessageTone("error");
                  } finally {
                    setIsBusy(false);
                    event.target.value = "";
                  }
                }}
              />
            </label>
            <button className="button" type="button" disabled={isBusy} onClick={runParse}>
              {isBusy ? "처리 중..." : openAIEnabled ? "AI 규칙 초안 생성" : "기본 초안 생성"}
            </button>
          </div>
          <div className="field-help" style={{ marginBottom: 12 }}>파일명: {fileName}</div>
          <div className="image-box">
            {previewUrl ? <img alt="시상표 원본" src={previewUrl} /> : <div className="empty-state" style={{ width: "100%" }}>아직 업로드된 원본 시상표가 없습니다.</div>}
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div className="card">
            <h2 className="card-title">규칙 카드 운영 원칙</h2>
            <p className="card-description">
              AI가 읽은 내용을 그대로 확정하지 말고, 카드별로 규칙 유형 / 지급시점 / 구간 / 대상 상품군을 확인한 뒤 저장합니다.
            </p>
            <div className="inline-group">
              <button className="button-secondary" type="button" onClick={() => addRule("percentage_payout")}>퍼센트형 추가</button>
              <button className="button-secondary" type="button" onClick={() => addRule("tiered_cash_next_month")}>익월 구간형 추가</button>
              <button className="button-secondary" type="button" onClick={() => addRule("tiered_cash_after_13th")}>13회차 구간형 추가</button>
              <button className="button-secondary" type="button" onClick={() => addRule("consecutive_bonus")}>연속가동 추가</button>
              <button className="button-secondary" type="button" onClick={() => addRule("trip_or_choice_reward")}>여행/택1 추가</button>
            </div>
          </div>

          {rules.map((rule, index) => (
            <div className="card" key={`${rule.ruleCode}-${index}`}>
              <div className="inline-group" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <h2 className="card-title" style={{ marginBottom: 0 }}>규칙 카드 {index + 1}</h2>
                <button className="button-danger" type="button" onClick={() => removeRule(index)}>삭제</button>
              </div>
              <div className="form-grid">
                <div>
                  <label className="field-label">규칙 유형</label>
                  <select className="select" value={rule.ruleType} onChange={(event) => updateRule(index, (prev) => ({ ...prev, ruleType: event.target.value as RuleType }))}>
                    <option value="percentage_payout">percentage_payout</option>
                    <option value="tiered_cash_next_month">tiered_cash_next_month</option>
                    <option value="tiered_cash_after_13th">tiered_cash_after_13th</option>
                    <option value="consecutive_bonus">consecutive_bonus</option>
                    <option value="trip_or_choice_reward">trip_or_choice_reward</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">규칙명</label>
                  <input className="input" value={rule.ruleName} onChange={(event) => updateRule(index, (prev) => ({ ...prev, ruleName: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">지급시점</label>
                  <input className="input" value={rule.payoutTimingType} onChange={(event) => updateRule(index, (prev) => ({ ...prev, payoutTimingType: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">기준값 타입</label>
                  <input className="input" value={rule.baseMetricType} onChange={(event) => updateRule(index, (prev) => ({ ...prev, baseMetricType: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">포함 상품군(쉼표구분)</label>
                  <input className="input" value={rule.targetInclude.join(", ")} onChange={(event) => updateRule(index, (prev) => ({ ...prev, targetInclude: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
                </div>
                <div>
                  <label className="field-label">제외 상품군(쉼표구분)</label>
                  <input className="input" value={rule.targetExclude.join(", ")} onChange={(event) => updateRule(index, (prev) => ({ ...prev, targetExclude: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))} />
                </div>
                <div>
                  <label className="field-label">설명</label>
                  <input className="input" value={rule.description} onChange={(event) => updateRule(index, (prev) => ({ ...prev, description: event.target.value }))} />
                </div>
                <div>
                  <label className="field-label">유지조건</label>
                  <div className="inline-group">
                    <label>
                      <input type="checkbox" checked={rule.maintenanceRequired} onChange={(event) => updateRule(index, (prev) => ({ ...prev, maintenanceRequired: event.target.checked }))} /> 유지 필요
                    </label>
                    <input className="input" style={{ maxWidth: 120 }} type="number" value={rule.maintenanceRound ?? ""} onChange={(event) => updateRule(index, (prev) => ({ ...prev, maintenanceRound: event.target.value ? Number(event.target.value) : null }))} placeholder="회차" />
                  </div>
                </div>
              </div>

              {rule.ruleType === "percentage_payout" ? (
                <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                  <div>
                    <label className="field-label">총 퍼센트</label>
                    <input className="input" type="number" value={rule.percentageTotal ?? ""} onChange={(event) => updateRule(index, (prev) => ({ ...prev, percentageTotal: event.target.value ? Number(event.target.value) : null }))} />
                  </div>
                  <div>
                    <label className="field-label">퍼센트 구성(한 줄에 항목:값)</label>
                    <textarea
                      className="textarea"
                      style={{ minHeight: 140 }}
                      value={rule.percentageBreakdown.map((item) => `${item.label}:${item.percent}`).join("\n")}
                      onChange={(event) => updateRule(index, (prev) => ({ ...prev, percentageBreakdown: parseBreakdownText(event.target.value) }))}
                    />
                  </div>
                </div>
              ) : null}

              {rule.ruleType !== "percentage_payout" ? (
                <div style={{ marginTop: 16 }}>
                  <div className="inline-group" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                    <label className="field-label" style={{ marginBottom: 0 }}>구간표</label>
                    <button className="button-secondary" type="button" onClick={() => updateRule(index, (prev) => ({ ...prev, tiers: [...prev.tiers, { thresholdValue: null, rewardCashAmount: null, rewardPercent: null }] }))}>구간 추가</button>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {rule.tiers.map((tier, tierIndex) => (
                      <div key={`${rule.ruleCode}-tier-${tierIndex}`} className="inline-group">
                        <input className="input" style={{ maxWidth: 180 }} type="number" value={tier.thresholdValue ?? ""} placeholder="기준금액" onChange={(event) => updateRule(index, (prev) => ({ ...prev, tiers: prev.tiers.map((item, idx) => idx === tierIndex ? { ...item, thresholdValue: event.target.value ? Number(event.target.value) : null } : item) }))} />
                        <input className="input" style={{ maxWidth: 180 }} type="number" value={tier.rewardCashAmount ?? ""} placeholder="지급금액" onChange={(event) => updateRule(index, (prev) => ({ ...prev, tiers: prev.tiers.map((item, idx) => idx === tierIndex ? { ...item, rewardCashAmount: event.target.value ? Number(event.target.value) : null } : item) }))} />
                        <button className="button-danger" type="button" onClick={() => updateRule(index, (prev) => ({ ...prev, tiers: prev.tiers.filter((_, idx) => idx !== tierIndex) }))}>삭제</button>
                      </div>
                    ))}
                    {rule.tiers.length === 0 ? <div className="field-help">아직 구간이 없습니다.</div> : null}
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 16 }}>
                <label className="field-label">비고(한 줄에 1개)</label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 120 }}
                  value={rule.notes.join("\n")}
                  onChange={(event) => updateRule(index, (prev) => ({ ...prev, notes: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) }))}
                />
              </div>

              {rule.ruleType === "trip_or_choice_reward" || rule.ruleType === "consecutive_bonus" ? (
                <div className="notice" style={{ marginTop: 16 }}>
                  <h3>고급 규칙 안내</h3>
                  <p>
                    여행 시상과 복합 연속가동 규칙은 조건셋/보상옵션이 필요합니다. 현재 카드에서는 핵심 정보만 편집하고, 세부 조건은 아래 승인 JSON 영역에서 직접 보완하세요.
                  </p>
                </div>
              ) : null}
            </div>
          ))}

          <div className="card">
            <h2 className="card-title">규칙 검증 결과</h2>
            <p className="card-description">계산 전에 꼭 확인해야 할 항목입니다.</p>
            {validationFlags.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {validationFlags.map((flag, index) => (
                  <div key={`${flag.field}-${index}`} className="info-item">
                    <div className="inline-group" style={{ marginBottom: 8 }}>
                      <span className={`badge ${flag.level === "warning" ? "warning" : flag.level === "error" ? "danger" : ""}`}>{flag.level}</span>
                      <strong>{flag.field}</strong>
                    </div>
                    <div>{flag.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">현재 검증 경고가 없습니다.</div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">승인 JSON</h2>
        <p className="card-description">규칙 카드 저장 시 이 JSON에 `rules` 배열이 반영됩니다. 복합 여행/연속 규칙은 여기서 추가 보완 가능합니다.</p>
        <textarea className="textarea" value={rawJsonText} onChange={(event) => setRawJsonText(event.target.value)} />
        <div className="form-actions">
          <button className="button-secondary" type="button" disabled={isBusy} onClick={saveRulesDraft}>규칙 카드 저장</button>
          <button className="button-secondary" type="button" disabled={isBusy} onClick={saveRawJson}>JSON 직접 저장</button>
          <button className="button" type="button" disabled={isBusy} onClick={publishVersion}>배포 확정</button>
        </div>
        {message ? <div className={`status-line ${messageTone === "success" ? "success" : ""} ${messageTone === "error" ? "error" : ""}`}>{message}</div> : null}
      </div>
    </div>
  );
}
