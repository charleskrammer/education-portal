export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    // Verify at least one migration has completed
    const rows = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
    `;
    const count = Number(rows[0]?.count ?? 0);
    if (count === 0) throw new Error("no migrations applied");
    logger.info("probe", { probe: "startup", status: "ok", migrations: count });
    return Response.json({ status: "ok", migrations: count, ts: new Date().toISOString() }, { status: 200 });
  } catch (err) {
    logger.error("probe", { probe: "startup", status: "fail", error: String(err) });
    return Response.json({ status: "not ready", error: String(err) }, { status: 503 });
  }
}
