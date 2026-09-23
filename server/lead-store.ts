import type { LeadPayload } from "@/server/leads";
import { getDatabase } from "@/server/database";

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
};

let schemaReady = false;

export type LeadStatus = "NEW" | "IN_PROGRESS" | "DONE" | "REJECTED";

export type LeadActor = {
  id: string;
  name: string;
  email: string;
};

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

export type LeadAuditEvent = {
  id: string;
  leadId: number;
  eventType: "DELETED";
  actorId: string;
  actorName: string;
  actorEmail: string;
  previousStatus: LeadStatus;
  createdAt: string;
};

export async function persistLead(lead: LeadPayload) {
  const db = await getDatabase();
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

  const inserted = await db.prepare(
    "SELECT id FROM leads WHERE phone = ? AND created_at = ? ORDER BY id DESC LIMIT 1",
  ).bind(lead.phone, lead.createdAt).first<{ id: number }>();

  return { persisted: true, id: inserted?.id };
}

export async function listLeads() {
  const db = await getDatabase();
  if (!db) return [] satisfies StoredLead[];

  await ensureLeadSchema(db);
  const payload = await db.prepare(
    "SELECT id, name, phone, email, message, product, material, area, page, attribution, status, created_at FROM leads WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100",
  ).all<LeadRow>();

  return (payload.results ?? []).map(mapLeadRow);
}

export async function getLead(id: number) {
  const db = await getDatabase();
  if (!db) return null;
  await ensureLeadSchema(db);
  const row = await db.prepare(
    "SELECT id, name, phone, email, message, product, material, area, page, attribution, status, created_at FROM leads WHERE id = ? AND deleted_at IS NULL LIMIT 1",
  ).bind(id).first<LeadRow>();
  return row ? mapLeadRow(row) : null;
}

export async function updateLeadStatus(id: number, status: LeadStatus) {
  const db = await getDatabase();
  if (!db) return null;

  await ensureLeadSchema(db);
  await db.prepare("UPDATE leads SET status = ? WHERE id = ? AND deleted_at IS NULL").bind(status, id).run();
  const payload = await db.prepare(
    "SELECT id, name, phone, email, message, product, material, area, page, attribution, status, created_at FROM leads WHERE id = ? AND deleted_at IS NULL LIMIT 1",
  ).bind(id).all<LeadRow>();

  const row = payload.results?.[0];
  return row ? mapLeadRow(row) : null;
}

export async function softDeleteLead(id: number, actor: LeadActor) {
  const db = await getDatabase();
  if (!db) return { result: "unavailable" as const };

  await ensureLeadSchema(db);
  const row = await db.prepare(
    "SELECT id, status FROM leads WHERE id = ? AND deleted_at IS NULL LIMIT 1",
  ).bind(id).first<{ id: number; status: string }>();
  if (!row) return { result: "not-found" as const };

  const previousStatus = normalizeLeadStatus(row.status);
  if (previousStatus !== "DONE" && previousStatus !== "REJECTED") {
    return { result: "not-terminal" as const, previousStatus };
  }

  const deletedAt = new Date().toISOString();
  const eventId = crypto.randomUUID();
  await db.batch([
    db.prepare(
      "UPDATE leads SET deleted_at = ?, deleted_by_id = ?, deleted_by_name = ?, deleted_by_email = ? WHERE id = ? AND deleted_at IS NULL",
    ).bind(deletedAt, actor.id, actor.name, actor.email, id),
    db.prepare(
      "INSERT INTO lead_audit_events (id, lead_id, event_type, actor_id, actor_name, actor_email, previous_status, created_at) VALUES (?, ?, 'DELETED', ?, ?, ?, ?, ?)",
    ).bind(eventId, id, actor.id, actor.name, actor.email, previousStatus, deletedAt),
  ]);

  return {
    result: "deleted" as const,
    audit: { id: eventId, leadId: id, eventType: "DELETED" as const, actorId: actor.id, actorName: actor.name, actorEmail: actor.email, previousStatus, createdAt: deletedAt },
  };
}

export async function listLeadAuditEvents(leadId?: number) {
  const db = await getDatabase();
  if (!db) return [] satisfies LeadAuditEvent[];
  await ensureLeadSchema(db);
  const query = leadId
    ? db.prepare("SELECT id, lead_id, event_type, actor_id, actor_name, actor_email, previous_status, created_at FROM lead_audit_events WHERE lead_id = ? ORDER BY created_at DESC").bind(leadId)
    : db.prepare("SELECT id, lead_id, event_type, actor_id, actor_name, actor_email, previous_status, created_at FROM lead_audit_events ORDER BY created_at DESC LIMIT 200");
  const payload = await query.all<LeadAuditRow>();
  return (payload.results ?? []).map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    eventType: "DELETED" as const,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorEmail: row.actor_email,
    previousStatus: normalizeLeadStatus(row.previous_status),
    createdAt: row.created_at,
  }));
}

async function ensureLeadSchema(db: D1DatabaseLike) {
  if (schemaReady) return;
  await db.prepare("CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', product TEXT NOT NULL DEFAULT '', material TEXT NOT NULL DEFAULT '', area TEXT NOT NULL DEFAULT '', page TEXT NOT NULL DEFAULT '', attribution TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'NEW', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, deleted_at TEXT, deleted_by_id TEXT, deleted_by_name TEXT, deleted_by_email TEXT)").run();
  await ensureColumn(db, "deleted_at", "TEXT");
  await ensureColumn(db, "deleted_by_id", "TEXT");
  await ensureColumn(db, "deleted_by_name", "TEXT");
  await ensureColumn(db, "deleted_by_email", "TEXT");
  await db.batch([
    db.prepare("UPDATE leads SET status = 'NEW' WHERE status = 'new'"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_leads_deleted_created ON leads(deleted_at, created_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS lead_audit_events (id TEXT PRIMARY KEY, lead_id INTEGER NOT NULL, event_type TEXT NOT NULL, actor_id TEXT NOT NULL, actor_name TEXT NOT NULL, actor_email TEXT NOT NULL, previous_status TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_lead_audit_lead_created ON lead_audit_events(lead_id, created_at)"),
  ]);
  schemaReady = true;
}

async function ensureColumn(db: D1DatabaseLike, name: string, definition: string) {
  try {
    await db.prepare(`ALTER TABLE leads ADD COLUMN ${name} ${definition}`).run();
  } catch (error) {
    if (!(error instanceof Error) || !/duplicate column|already exists/i.test(error.message)) throw error;
  }
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
  if (value === "IN_PROGRESS" || value === "DONE" || value === "REJECTED") return value;
  return "NEW";
}

type LeadAuditRow = {
  id: string;
  lead_id: number;
  event_type: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  previous_status: string;
  created_at: string;
};

function safeAttribution(value: string) {
  try {
    return JSON.parse(value) as { firstTouch?: { source?: string }; lastTouch?: { source?: string } };
  } catch {
    return {};
  }
}
