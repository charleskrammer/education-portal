import { NextRequest, NextResponse } from "next/server";

function logfmt(fields: Record<string, string | number | boolean>): string {
  return Object.entries(fields)
    .map(([k, v]) => {
      const s = String(v);
      return /[\s"=]/.test(s) ? `${k}="${s}"` : `${k}=${s}`;
    })
    .join(" ");
}

export function middleware(req: NextRequest) {
  const line = logfmt({
    ts: new Date().toISOString(),
    level: "info",
    msg: "request",
    method: req.method,
    path: req.nextUrl.pathname,
  });
  console.log(line);
  return NextResponse.next();
}

export const config = {
  matcher: ["/health/:path*", "/metrics", "/api/:path*"],
};
