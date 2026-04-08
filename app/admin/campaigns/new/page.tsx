import { CampaignForm } from "@/components/admin/campaign-form";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getInsurers } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/env";

export default async function NewCampaignPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const insurers = await getInsurers();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">시상안 등록</h1>
          <p className="page-description">
            보험사/연월/주차를 먼저 생성한 뒤, 검수 화면에서 원본 이미지와 AI 분석 결과를
            채워갑니다.
          </p>
        </div>
      </div>

      <CampaignForm insurers={insurers} />
    </div>
  );
}
