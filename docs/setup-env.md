# 환경변수 설정 안내

배포 서비스(Netlify 또는 Vercel)와 로컬 `.env.local`에 아래 값을 넣습니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_PARSER_MODEL` (선택, 기본값 `gpt-4o-mini`)

## 메모
- `SUPABASE_SERVICE_ROLE_KEY`는 브라우저에 노출되면 안 됩니다.
- 관리자 화면은 서버 측 코드에서만 service role key를 사용합니다.
- 시상표 AI 분석은 `OPENAI_API_KEY`가 없으면 기본 템플릿 초안만 생성합니다.
