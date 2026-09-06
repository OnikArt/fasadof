import { getDatabase } from "@/server/database";

let schemaReady = false;

export async function claimIntegrationEvent(provider: string, eventId: string) {
  const db = await getDatabase();
  if (!db) return true;
  await ensureSchema();

  const id = `${provider}:${eventId}`;
  const existing = await db.prepare("SELECT id FROM integration_events WHERE id = ? LIMIT 1").bind(id).first<{ id: string }>();
  if (existing) return false;

  try {
    await db.prepare(
      "INSERT INTO integration_events (id, provider, event_id, created_at) VALUES (?, ?, ?, ?)",
    ).bind(id, provider, eventId, new Date().toISOString()).run();
    return true;
  } catch {
    return false;
  }
}

export async function releaseIntegrationEvent(provider: string, eventId: string) {
  const db = await getDatabase();
  if (!db) return;
  await ensureSchema();
  await db.prepare("DELETE FROM integration_events WHERE id = ?").bind(`${provider}:${eventId}`).run();
}

async function ensureSchema() {
  if (schemaReady) return;
  const db = await getDatabase();
  if (!db) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS integration_events (id TEXT PRIMARY KEY, provider TEXT NOT NULL, event_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_integration_events_provider_created ON integration_events(provider, created_at)"),
  ]);
  schemaReady = true;
}
