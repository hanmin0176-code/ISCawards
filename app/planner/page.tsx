import { PlannerSearchClient } from "@/components/planner/planner-search-client";
import { SetupNotice } from "@/components/admin/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function PlannerPage() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  return <PlannerSearchClient />;
}
