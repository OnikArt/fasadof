import type { LeadPayload } from "@/server/leads";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
};

let schemaReady = false;

export type LeadStatus = "NEW" | "IN_PROGRESS" | "DONE";

export type StoredLead = {
  id: number;
  name: string;
  phone: string;
  email: string;
  message: string;
  product: string;
  material: string;
  area: string;
  page: string;
  source: string;
  status: LeadStatus;
  createdAt: string;
};

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
    "INSERT INTO leads (name, phone, email, message, product, material, area, page, attribution, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(
    lead.name,
    lead.phone,
    lead.email ?? "",
    lead.message,
    lead.product,
    lead.material,
    lead.area,
    lead.page,
    JSON.stringify(lead.attribution),
    "NEW",
    lead.createdAt,
  ).run();

  return { persisted: true };
}

export async function listLeads() {
  const db = await getD1();
  if (!db) return [] satisfies StoredLead[];

  await ensureLeadSchema(db);
  const payload = await db.prepare(
    "SELECT id, name, phone, email, message, product, material, area, page, attribution, status, created_at FROM leads ORDER BY created_at DESC LIMIT 100",
  ).all<LeadRow>();

  return (payload.results ?? []).map(mapLeadRow);
}

export async function updateLeadStatus(id: number, status: LeadStatus) {
  const db = await getD1();
  if (!db) return null;

  await ensureLeadSchema(db);
  await db.prepare("UPDATE leads SET status = ? WHERE id = ?").bind(status, id).run();
  const payload = await db.prepare(
    "SELECT id, name, phone, email, message, product, material, area, page, attribution, status, created_at FROM leads WHERE id = ? LIMIT 1",
  ).bind(id).all<LeadRow>();

  const row = payload.results?.[0];
  return row ? mapLeadRow(row) : null;
}

async function ensureLeadSchema(db: D1DatabaseLike) {
  if (schemaReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', product TEXT NOT NULL DEFAULT '', material TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '', page TEXT NOT NULL DEFAULT '', attribution TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'NEW', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("UPDATE leads SET status = 'NEW' WHERE status = 'new'"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at)"),
  ]);
  schemaReady = true;
}

type LeadRow = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  product: string;
  material: string;
  area: string;
  page: string;
  attribution: string;
  status: string;
  created_at: string;
};

function mapLeadRow(row: LeadRow): StoredLead {
  const attribution = safeAttribution(row.attribution);
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? "",
    message: row.message,
    product: row.product,
    material: row.material,
    area: row.area,
    page: row.page,
    source: attribution.lastTouch?.source ?? attribution.firstTouch?.source ?? "Direct",
    status: normalizeLeadStatus(row.status),
    createdAt: row.created_at,
  };
}

function normalizeLeadStatus(value: string): LeadStatus {
  if (value === "IN_PROGRESS" || value === "DONE") return value;
  return "NEW";
}

function safeAttribution(value: string) {
  try {
    return JSON.parse(value) as { firstTouch?: { source?: string }; lastTouch?: { source?: string } };
  } catch {
    return {};
  }
}
