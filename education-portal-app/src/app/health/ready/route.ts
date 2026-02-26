import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    logger.info("probe", { probe: "ready", status: "ok" });
    return Response.json({ status: "ready", ts: new Date().toISOString() }, { status: 200 });
  } catch (err) {
    logger.error("probe", { probe: "ready", status: "fail", error: String(err) });
    return Response.json({ status: "not ready", error: "db unavailable" }, { status: 503 });
  }
}
