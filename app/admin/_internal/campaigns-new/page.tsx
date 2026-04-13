import { CampaignFormV2 } from "@/components/admin/campaign-form-v2";
import { SetupNotice } from "@/components/admin/setup-notice";
import { getInsurers } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/env";

export default async function InternalNewCampaignPage() {
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
            보험사, 연도, 월, 주차를 선택하면 시상안 이름이 자동으로 생성됩니다.
          </p>
        </div>
      </div>

      <CampaignFormV2 insurers={insurers.map((item) => ({ id: item.id, insurerName: item.insurerName }))} />
    </div>
  );
}
