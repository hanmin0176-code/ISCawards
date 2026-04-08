'use client';

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { prettyJson } from "@/lib/incentive-schema";

type ReviewWorkspaceV2Props = {
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
    validationResultJson: unknown;
    publishedAt: string | null;
    updatedAt: string;
    changeNote: string | null;
  };
  imageUrl: string | null;
  openAIEnabled: boolean;
};

type ValidationFlag = {
  level?: string;
  field?: string;
  message?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatLabel(label: string) {
  return label
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPrimitive(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "없음";
  }

  if (typeof value === "boolean") {
    return value ? "예" : "아니오";
  }

  return String(value);
}

function getStatusBadgeClass(status: string) {
  if (status === "published") return "badge success";
  if (status === "approved") return "badge";
  if (status === "ai_parsed") return "badge warning";
  return "badge";
}

function getSectionTitle(section: Record<string, unknown>, index: number) {
  const candidates = [
    section.section_name,
    section.tier,
    section.section_code,
    section.title,
    section.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return `섹션 ${index + 1}`;
}

function getSectionSummary(section: Record<string, unknown>) {
  const parts: string[] = [];

  const metricType = section.metric_type;
  if (typeof metricType === "string" && metricType.trim()) {
    parts.push(`기준: ${metricType}`);
  }

  const stackMode = section.stack_mode;
  if (typeof stackMode === "string" && stackMode.trim()) {
    parts.push(`중복처리: ${stackMode}`);
  }

  const maintenancePolicy = section.maintenance_policy;
  if (isRecord(maintenancePolicy) && maintenancePolicy.required) {
    parts.push(`유지조건: ${formatPrimitive(maintenancePolicy.round_no)}회차`);
  }

  return parts.length > 0 ? parts.join(" / ") : "세부 조건 확인 필요";
}

function renderNestedValue(value: unknown, keyPrefix: string): ReactNode {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <div className="field-help">없음</div>;
    }

    return (
      <div style={{ display: "grid", gap: 10 }}>
        {value.map((item, index) => (
          <div key={`${keyPrefix}-${index}`} className="info-item">
            <div className="info-label">항목 {index + 1}</div>
            <div>{renderNestedValue(item, `${keyPrefix}-${index}`)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (isRecord(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      return <div className="field-help">없음</div>;
    }

    return (
      <div style={{ display: "grid", gap: 10 }}>
        {entries.map(([childKey, childValue]) => (
          <div key={`${keyPrefix}-${childKey}`} className="info-item">
            <div className="info-label">{formatLabel(childKey)}</div>
            <div>{renderNestedValue(childValue, `${keyPrefix}-${childKey}`)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <div className="info-value">{formatPrimitive(value)}</div>;
}

function SectionCard({
  section,
  index,
}: {
  section: Record<string, unknown>;
  index: number;
}) {
  const title = getSectionTitle(section, index);
  const summary = getSectionSummary(section);
  const entries = Object.entries(section).filter(([key]) => key !== "section_name");

  return (
    <div className="card">
      <div className="inline-group" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <h3 className="card-title" style={{ marginBottom: 0 }}>
          {title}
        </h3>
        <span className="badge">섹션 {index + 1}</span>
      </div>
      <p className="card-description" style={{ marginBottom: 14 }}>
        {summary}
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {entries.map(([key, value]) => (
          <div key={`${title}-${key}`}>
            <div className="field-label" style={{ marginBottom: 8 }}>
              {formatLabel(key)}
            </div>
            {renderNestedValue(value, `${title}-${key}`)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationCard({ flags }: { flags: ValidationFlag[] }) {
  if (flags.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">검증 결과</h2>
        <p className="card-description">현재 경고가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card-title">검증 결과</h2>
      <p className="card-description">
        아래 항목은 “잘못 입력됨”이 아니라, 사람이 다시 확인해야 할 포인트입니다.
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {flags.map((flag, index) => {
          const badgeClass =
            flag.level === "error"
              ? "badge danger"
              : flag.level === "warning"
                ? "badge warning"
                : "badge";

          return (
            <div key={`${flag.field ?? "flag"}-${index}`} className="info-item">
              <div className="inline-group" style={{ marginBottom: 8 }}>
                <span className={badgeClass}>{flag.level ?? "info"}</span>
                <strong>{flag.field ?? "확인필요"}</strong>
              </div>
              <div>{flag.message ?? "메시지 없음"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewWorkspaceV2({
  campaign,
  version,
  imageUrl,
  openAIEnabled,
}: ReviewWorkspaceV2Props) {
  const router = useRouter();
  const initialPayload =
    isRecord(version.approvedJson) && Object.keys(version.approvedJson).length > 0
      ? version.approvedJson
      : version.aiParsedJson;

  const [jsonText, setJsonText] = useState(prettyJson(initialPayload));
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"default" | "success" | "error">("default");
  const [isBusy, setIsBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(imageUrl);
  const [fileName, setFileName] = useState<string>(version.sourceFileName ?? "업로드 전");
  const [payload, setPayload] = useState<unknown>(initialPayload);

  const payloadRecord = isRecord(payload) ? payload : {};
  const campaignMeta = isRecord(payloadRecord.campaign_meta) ? payloadRecord.campaign_meta : {};
  const sections = Array.isArray(payloadRecord.sections)
    ? payloadRecord.sections.filter((section): section is Record<string, unknown> => isRecord(section))
    : [];
  const validationFlags = Array.isArray(payloadRecord.validation_flags)
    ? payloadRecord.validation_flags.filter((flag): flag is ValidationFlag => isRecord(flag))
    : Array.isArray(version.validationResultJson)
      ? version.validationResultJson.filter((flag): flag is ValidationFlag => isRecord(flag))
      : [];

  const summaryText = useMemo(() => {
    if (sections.length === 0) {
      return "아직 섹션이 정리되지 않았습니다. AI 분석 후 카드 검토를 진행하세요.";
    }

    return `${sections.length}개 섹션이 추출되었습니다. 카드별로 금액, 기간, 유지조건을 확인하세요.`;
  }, [sections.length]);

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

      setPayload(result.aiParsedJson);
      setJsonText(prettyJson(result.aiParsedJson));
      setMessage("AI 분석 결과를 카드형 화면으로 갱신했습니다. 오른쪽 카드부터 검수하세요.");
      setMessageTone("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
      setMessageTone("error");
    } finally {
      setIsBusy(false);
    }
  }

  async function saveApprovedJson() {
    setIsBusy(true);
    setMessage(null);

    try {
      const parsed = JSON.parse(jsonText) as unknown;
      const response = await fetch(`/api/admin/campaign-versions/${version.id}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approvedJson: parsed }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "승인 JSON 저장에 실패했습니다.");
      }

      setPayload(parsed);
      setMessage("승인 JSON이 저장되었습니다. 카드 화면과 검증 결과를 다시 확인하세요.");
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
          <h1 className="page-title">시상안 카드형 검수 화면</h1>
          <p className="page-description">
            왼쪽 원본 이미지와 오른쪽 카드 요약을 비교해서 검수한 뒤, 필요하면 아래 JSON을 수정해 저장합니다.
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
            <div className="info-value">
              {campaign.campaignYear}.{campaign.campaignMonth} / {campaign.weekLabel}
            </div>
          </div>
          <div className="info-item">
            <div className="info-label">실적 기간</div>
            <div className="info-value">
              {campaign.salesPeriodStart ?? "미입력"} ~ {campaign.salesPeriodEnd ?? "미입력"}
            </div>
          </div>
        </div>
      </div>

      <div className="review-grid">
        <div className="card">
          <h2 className="card-title">원본 시상표</h2>
          <p className="card-description">
            업로드 직후에도 왼쪽 미리보기가 바로 보이도록 즉시 반영합니다.
          </p>

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
                    setMessage("원본 이미지가 업로드되었습니다. 왼쪽 미리보기를 바로 확인할 수 있습니다.");
                    setMessageTone("success");
                    router.refresh();
                  } catch (error) {
                    setMessage(
                      error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
                    );
                    setMessageTone("error");
                  } finally {
                    setIsBusy(false);
                    event.target.value = "";
                  }
                }}
              />
            </label>
            <button className="button" type="button" disabled={isBusy} onClick={runParse}>
              {isBusy ? "처리 중..." : openAIEnabled ? "AI 분석 실행" : "기본 초안 생성"}
            </button>
          </div>

          <div className="field-help" style={{ marginBottom: 12 }}>
            파일명: {fileName}
          </div>

          <div className="image-box">
            {previewUrl ? (
              <img alt="시상표 원본" src={previewUrl} />
            ) : (
              <div className="empty-state" style={{ width: "100%" }}>
                아직 업로드된 원본 시상표가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div className="card">
            <h2 className="card-title">사람이 읽는 요약</h2>
            <p className="card-description">
              현재 AI가 읽은 결과를 카드형으로 바꿔 보여줍니다. JSON을 직접 해석할 필요 없이 먼저 이 카드부터 보시면 됩니다.
            </p>
            <div className="notice" style={{ marginBottom: 14 }}>
              <h3 style={{ marginBottom: 8 }}>현재 해석 상태</h3>
              <p style={{ margin: 0 }}>{summaryText}</p>
            </div>
            <div className="info-grid">
              {Object.entries(campaignMeta).map(([key, value]) => (
                <div key={key} className="info-item">
                  <div className="info-label">{formatLabel(key)}</div>
                  <div className="info-value">{formatPrimitive(value)}</div>
                </div>
              ))}
            </div>
          </div>

          {sections.length > 0 ? (
            sections.map((section, index) => (
              <SectionCard key={`${getSectionTitle(section, index)}-${index}`} section={section} index={index} />
            ))
          ) : (
            <div className="card">
              <h2 className="card-title">섹션 카드</h2>
              <p className="card-description">
                아직 카드로 표시할 섹션이 없습니다. AI 분석을 먼저 실행하거나 JSON을 직접 입력해 주세요.
              </p>
            </div>
          )}

          <ValidationCard flags={validationFlags} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">승인 JSON 편집</h2>
        <p className="card-description">
          카드형 화면으로 먼저 검수하고, 필요할 때만 아래 JSON을 수정하면 됩니다.
        </p>
        <textarea
          className="textarea"
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
        />
        <div className="form-actions">
          <button className="button-secondary" type="button" disabled={isBusy} onClick={saveApprovedJson}>
            승인 JSON 저장
          </button>
          <button className="button" type="button" disabled={isBusy} onClick={publishVersion}>
            배포 확정
          </button>
        </div>
        {message ? (
          <div
            className={`status-line ${messageTone === "success" ? "success" : ""} ${
              messageTone === "error" ? "error" : ""
            }`}
          >
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
