import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Liveness probe. No DB dependency — responds immediately.
 * Used by:
 *   - Dockerfile HEALTHCHECK
 *   - docker-compose.yml healthcheck
 *   - Load balancer probes
 *
 * Returns 200 { status: "ok", timestamp } always.
 * Never returns 5xx unless the process is completely broken.
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
