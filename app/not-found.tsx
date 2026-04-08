import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ maxWidth: 520, width: "100%" }}>
        <h1 className="page-title" style={{ fontSize: 32, marginBottom: 12 }}>
          페이지를 찾을 수 없습니다
        </h1>
        <p className="page-description" style={{ marginBottom: 20 }}>
          요청한 시상안이 없거나 주소가 잘못되었습니다.
        </p>
        <Link className="button" href="/admin">
          대시보드로 이동
        </Link>
      </div>
    </div>
  );
}
