import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getEnv, isSupabaseConfigured } from "@/lib/env";

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 환경변수가 아직 설정되지 않았습니다.");
  }

  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
