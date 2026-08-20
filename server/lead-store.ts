import type { LeadPayload } from "@/server/leads";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
};

let schemaReady = false;

async function getD1() {
  try {
    const mod = await import("cloudflare:workers");
    return mod.env.DB as unknown as D1DatabaseLike | undefined;
  } catch {
    return undefined;
  }
}

export async function persistLead(lead: LeadPayload) {
  const db = await getD1();
  if (!db) return { persisted: false, reason: "D1 binding is not configured" };

  await ensureLeadSchema(db);
  await db.prepare(
    "INSERT INTO leads (name, phone, message, product, material, area, page, attribution, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(
    lead.name,
    lead.phone,
    lead.message,
    lead.product,
    lead.material,
    lead.area,
    lead.page,
    JSON.stringify(lead.attribution),
    "new",
    lead.createdAt,
  ).run();

  return { persisted: true };
}

async function ensureLeadSchema(db: D1DatabaseLike) {
  if (schemaReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, message TEXT NOT NULL DEFAULT '', product TEXT NOT NULL DEFAULT '', material TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '', page TEXT NOT NULL DEFAULT '', attribution TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at)"),
  ]);
  schemaReady = true;
}
