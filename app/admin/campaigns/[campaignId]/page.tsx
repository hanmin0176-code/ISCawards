import { redirect } from "next/navigation";

export default function CampaignDetailPage({
  params,
}: {
  params: { campaignId: string };
}) {
  redirect(`/admin/campaigns/${params.campaignId}/review-v2`);
}
