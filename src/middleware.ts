import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppPassword } from "@/lib/env";

export function middleware(request: NextRequest) {
  const password = getAppPassword();
  if (!password) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/health")) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = atob(auth.slice(6));
    const [, pass] = decoded.split(":");
    if (pass === password) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Budget"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
