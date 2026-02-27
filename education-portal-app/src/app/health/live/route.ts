export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";

export async function GET() {
  logger.info("probe", { probe: "live", status: "ok" });
  return Response.json({ status: "ok", ts: new Date().toISOString() }, { status: 200 });
}
