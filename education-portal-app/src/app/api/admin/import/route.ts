import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

/** Parse a CSV string into an array of objects keyed by header row. */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { cols.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseRow(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 });

  // Load all teams for matching
  const teams = await db.team.findMany();
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t.id]));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because row 1 is headers

    const email = (row["userprincipalname"] ?? row["email"] ?? "").toLowerCase().trim();
    const displayName = (row["displayname"] ?? row["name"] ?? "").trim();
    const department = (row["department"] ?? "").trim();
    const jobTitle = (row["jobtitle"] ?? row["job title"] ?? "").trim();

    if (!email || !displayName) {
      errors.push(`Row ${rowNum}: missing email or name — skipped`);
      skipped++;
      continue;
    }

    const teamId = teamByName.get(department.toLowerCase());
    if (!teamId) {
      errors.push(`Row ${rowNum}: team "${department}" not found — skipped`);
      skipped++;
      continue;
    }

    const role = /manager/i.test(jobTitle) ? "manager" : "learner";
    const externalId = email.replace("@", ".").replace(/[^a-z0-9._-]/g, "");

    await db.user.upsert({
      where: { email },
      update: { name: displayName, role, teamId },
      create: { externalId, name: displayName, email, role, teamId, passwordHash: null },
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped, errors });
}
