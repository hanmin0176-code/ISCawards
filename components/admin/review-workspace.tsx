'use client';

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { prettyJson, summarizePayload } from "@/lib/incentive-schema";

type ReviewWorkspaceProps = {
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
    aiParsedJson: any;
    approvedJson: any;
    validationResultJson: any;
    publishedAt: string | null;
    updatedAt: string;
    changeNote: string | null;
  };
  imageUrl: string | null;
  openAIEnabled: boolean;
};

function getStatusBadgeClass(status: string) {
  if (status === "published") return "badge success";
  if (status === "approved") return "badge";
  if (status === "ai_parsed") return "badge warning";
  return "badge";
}

export function ReviewWorkspace({
  campaign,
  version,
  imageUrl,
  openAIEnabled,
}: ReviewWorkspaceProps) {
  const router = useRouter();
  const initialPayload =
    version.approvedJson && Object.keys(version.approvedJson).length > 0
      ? version.approvedJson
      : version.aiParsedJson;

  const [jsonText, setJsonText] = useState(prettyJson(initialPayload));
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"default" | "success" | "error">("default");
  const [isBusy, setIsBusy] = useState(false);

  const summaryLines = useMemo(() => summarizePayload(version.aiParsedJson), [version.aiParsedJson]);
  const validationFlags = Array.isArray(version.validationResultJson)
    ? version.validationResultJson
    : [];

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

      setJsonText(prettyJson(result.aiParsedJson));
      setMessage("AI 분석 초안을 불러왔습니다. 오른쪽 JSON을 검토 후 저장하세요.");
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
      const parsed = JSON.parse(jsonText);
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
          <h1 className="page-title">시상안 AI 분석 검수</h1>
          <p className="page-description">
            원본 이미지를 업로드한 뒤 AI 초안을 생성하고, 오른쪽 JSON을 수정 후 저장·배포합니다.
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
            이미지 업로드 후 왼쪽 원본과 오른쪽 구조화 JSON을 비교 검수합니다.
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

                  try {
                    await uploadImage(file);
                    setMessage("원본 이미지가 업로드되었습니다.");
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
            파일명: {version.sourceFileName ?? "업로드 전"}
          </div>

          <div className="image-box">
            {imageUrl ? (
              <img alt="시상표 원본" src={imageUrl} />
            ) : (
              <div className="empty-state" style={{ width: "100%" }}>
                아직 업로드된 원본 시상표가 없습니다.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div className="card">
            <h2 className="card-title">AI 분석 요약</h2>
            <p className="card-description">AI가 인식한 섹션 요약입니다.</p>
            <ul className="summary-list">
              {summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="card-title">승인 JSON 편집</h2>
            <p className="card-description">
              AI 초안 또는 수기 수정 내용을 저장합니다. 배포 전 마지막 검수 단계입니다.
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
              <div className={`status-line ${messageTone === "success" ? "success" : ""} ${messageTone === "error" ? "error" : ""}`}>
                {message}
              </div>
            ) : null}
          </div>

          <div className="card">
            <h2 className="card-title">검증 결과</h2>
            <p className="card-description">누락 항목이나 확인 필요 포인트를 표시합니다.</p>
            {validationFlags.length > 0 ? (
              <ul className="validation-list">
                {validationFlags.map((flag: any, index: number) => (
                  <li key={`${flag.field}-${index}`}>
                    [{flag.level}] {flag.field} - {flag.message}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">현재 검증 경고가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
