export function SetupNotice() {
  return (
    <div className="notice">
      <h3>환경변수 설정이 필요합니다</h3>
      <p>
        아직 관리자 화면이 Supabase와 연결되지 않았습니다. 아래 값을 배포 서비스 또는 로컬
        <code> .env.local </code>에 넣어주세요.
      </p>
      <ul>
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        <li>SUPABASE_SERVICE_ROLE_KEY</li>
        <li>OPENAI_API_KEY</li>
      </ul>
    </div>
  );
}
