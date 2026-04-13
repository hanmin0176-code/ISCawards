import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/campaigns") {
    return NextResponse.rewrite(new URL("/admin/_internal/campaigns", request.url));
  }

  if (pathname === "/admin/campaigns/new") {
    return NextResponse.rewrite(new URL("/admin/_internal/campaigns-new", request.url));
  }

  const reviewMatch = pathname.match(/^\/admin\/campaigns\/([^/]+)\/review$/);
  if (reviewMatch) {
    return NextResponse.rewrite(
      new URL(`/admin/campaigns/${reviewMatch[1]}/review-v2`, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
