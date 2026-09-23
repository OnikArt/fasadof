import { getDatabase } from "@/server/database";

export type ChatStatus = "NEW" | "WAITING_MANAGER" | "IN_PROGRESS" | "CLOSED";
export type ChatRole = "user" | "assistant" | "operator" | "system";

export type ChatMessageRecord = {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  authorName: string | null;
  createdAt: string;
};

export type ChatSessionRecord = {
  id: string;
  status: ChatStatus;
  page: string;
  source: string;
  attribution: unknown;
  customerToken: string;
  operatorId: string | null;
  operatorName: string | null;
  closedAt: string | null;
  closedBy: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatRatingRecord = {
  id: string;
  conversationId: string;
  rating: number;
  comment: string;
  employeeId: string | null;
  createdAt: string;
};

export type CustomerSessionInput = {
  sessionId?: string;
  customerToken?: string;
  page?: string;
  attribution?: unknown;
  source?: string;
};

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown>;
};

type MemoryStore = {
  sessions: ChatSessionRecord[];
  messages: ChatMessageRecord[];
  ratings: ChatRatingRecord[];
  commands: ChatCommandRecord[];
  operatorPresence: Record<string, { name: string; email: string; seenAt: string }>;
  schemaReady: boolean;
};

const globalStore = globalThis as typeof globalThis & { __fasadofSupportStore?: MemoryStore };

function memoryStore(): MemoryStore {
  if (!globalStore.__fasadofSupportStore) {
    globalStore.__fasadofSupportStore = { sessions: [], messages: [], ratings: [], commands: defaultCommands(), operatorPresence: {}, schemaReady: false };
  }
  return globalStore.__fasadofSupportStore;
}

const OPERATOR_PRESENCE_TTL_MS = 45_000;
const OPERATOR_WAIT_TIMEOUT_MS = Number(process.env.MANAGER_WAIT_TIMEOUT_MS || 5 * 60_000);

export async function getOrCreateCustomerSession(input: CustomerSessionInput) {
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    if (input.sessionId && input.customerToken) {
      const existing = await db
        .prepare("SELECT * FROM chat_sessions WHERE id = ? AND customer_token = ?")
        .bind(input.sessionId, input.customerToken)
        .first<D1ChatSession>();
      if (existing) return mapD1Session(existing);
    }

    const session = createNewSession(input);
    await db.prepare(
      "INSERT INTO chat_sessions (id, status, page, source, customer_token, attribution, operator_id, operator_name, contact, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      session.id,
      session.status,
      session.page,
      session.source,
      session.customerToken,
      JSON.stringify(session.attribution ?? {}),
      session.operatorId,
      session.operatorName,
      null,
      session.createdAt,
      session.updatedAt,
    ).run();
    return session;
  }

  const store = memoryStore();
  if (input.sessionId && input.customerToken) {
    const existing = store.sessions.find((session) => session.id === input.sessionId && session.customerToken === input.customerToken);
    if (existing) return existing;
  }

  const session = createNewSession(input);
  store.sessions.unshift(session);
  return session;
}

export async function getCustomerSession(sessionId: string, customerToken: string) {
  await resumeTimedOutWaitingSessions();
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const session = await db
      .prepare("SELECT * FROM chat_sessions WHERE id = ? AND customer_token = ?")
      .bind(sessionId, customerToken)
      .first<D1ChatSession>();
    return session ? mapD1Session(session) : null;
  }

  return memoryStore().sessions.find((session) => session.id === sessionId && session.customerToken === customerToken) ?? null;
}

export async function appendMessage(input: {
  sessionId: string;
  role: ChatRole;
  content: string;
  authorName?: string | null;
}) {
  const message: ChatMessageRecord = {
    id: randomId("msg"),
    sessionId: input.sessionId,
    role: input.role,
    content: input.content,
    authorName: input.authorName ?? null,
    createdAt: new Date().toISOString(),
  };

  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    await db.prepare(
      "INSERT INTO chat_messages (id, session_id, role, content, author_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(message.id, message.sessionId, message.role, message.content, message.authorName, message.createdAt).run();
    await touchSession(message.sessionId);
    return message;
  }

  memoryStore().messages.push(message);
  await touchSession(message.sessionId);
  return message;
}

export async function listCustomerMessages(sessionId: string, customerToken: string) {
  const session = await getCustomerSession(sessionId, customerToken);
  if (!session) return null;
  return listMessages(sessionId);
}

export async function listMessages(sessionId: string) {
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const result = await db
      .prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC")
      .bind(sessionId)
      .all<D1ChatMessage>();
    return (result.results ?? []).map(mapD1Message);
  }

  return memoryStore().messages
    .filter((message) => message.sessionId === sessionId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function requestOperator(sessionId: string) {
  const session = await getConversation(sessionId);
  if (!session || session.status === "WAITING_MANAGER" || session.status === "IN_PROGRESS" || session.status === "CLOSED") return false;
  await updateSessionStatus(sessionId, "WAITING_MANAGER");
  await appendMessage({
    sessionId,
    role: "system",
    content: "Диалог передан менеджеру. Сообщения сохраняются в очереди поддержки.",
  });
  return true;
}

export async function resumeTimedOutWaitingSessions() {
  const cutoff = new Date(Date.now() - OPERATOR_WAIT_TIMEOUT_MS).toISOString();
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const result = await db
      .prepare("SELECT * FROM chat_sessions WHERE status = ? AND updated_at < ?")
      .bind("WAITING_MANAGER", cutoff)
      .all<D1ChatSession>();
    for (const row of result.results ?? []) {
      await updateSessionStatus(row.id, "NEW");
      await appendMessage({
        sessionId: row.id,
        role: "system",
        content: "Менеджер пока не ответил. Справочный помощник продолжит отвечать по данным сайта.",
      });
    }
    return;
  }

  const stale = memoryStore().sessions.filter((session) => session.status === "WAITING_MANAGER" && session.updatedAt < cutoff);
  for (const session of stale) {
    session.status = "NEW";
    session.updatedAt = new Date().toISOString();
    await appendMessage({
      sessionId: session.id,
      role: "system",
      content: "Менеджер пока не ответил. Справочный помощник продолжит отвечать по данным сайта.",
    });
  }
}

export async function recordManagerHeartbeat(manager: { email: string; name: string }) {
  const now = new Date().toISOString();
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    await db
      .prepare("UPDATE operators SET updated_at = ? WHERE email = ?")
      .bind(now, manager.email)
      .run();
  }

  memoryStore().operatorPresence[manager.email] = { email: manager.email, name: manager.name, seenAt: now };
}

export async function hasOnlineManagers() {
  const cutoff = new Date(Date.now() - OPERATOR_PRESENCE_TTL_MS).toISOString();
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const row = await db
      .prepare("SELECT email FROM operators WHERE is_active = 1 AND updated_at > ? LIMIT 1")
      .bind(cutoff)
      .first<{ email: string }>();
    if (row) return true;
  }

  return Object.values(memoryStore().operatorPresence).some((presence) => presence.seenAt > cutoff);
}

export async function listConversations(status?: ChatStatus | "ALL", archivedOnly = false) {
  await resumeTimedOutWaitingSessions();
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const result = status && status !== "ALL"
      ? await db
        .prepare(`SELECT * FROM chat_sessions WHERE status = ? AND archived_at IS ${archivedOnly ? "NOT NULL" : "NULL"} ORDER BY updated_at DESC LIMIT 80`)
        .bind(status)
        .all<D1ChatSession>()
      : await db
        .prepare(`SELECT * FROM chat_sessions WHERE archived_at IS ${archivedOnly ? "NOT NULL" : "NULL"} ORDER BY updated_at DESC LIMIT 80`)
        .all<D1ChatSession>();
    return (result.results ?? []).map(mapD1Session);
  }

  const sessions = memoryStore().sessions;
  return sessions
    .filter((session) => (archivedOnly ? Boolean(session.archivedAt) : !session.archivedAt) && (!status || status === "ALL" || session.status === status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 80);
}

export async function getConversation(sessionId: string) {
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const session = await db.prepare("SELECT * FROM chat_sessions WHERE id = ?").bind(sessionId).first<D1ChatSession>();
    return session ? mapD1Session(session) : null;
  }

  return memoryStore().sessions.find((session) => session.id === sessionId) ?? null;
}

export async function takeConversation(sessionId: string, manager: { email: string; name: string }) {
  const current = await getConversation(sessionId);
  if (!current || current.status === "CLOSED") return false;
  if (current.status === "IN_PROGRESS" && current.operatorId === manager.email) return true;
  const db = await getDatabase();
  const now = new Date().toISOString();
  if (db) {
    await ensureD1Schema(db);
    await db
      .prepare("UPDATE chat_sessions SET status = ?, operator_id = ?, operator_name = ?, updated_at = ? WHERE id = ?")
      .bind("IN_PROGRESS", manager.email, manager.name, now, sessionId)
      .run();
  } else {
    const session = memoryStore().sessions.find((item) => item.id === sessionId);
    if (session) {
      session.status = "IN_PROGRESS";
      session.operatorId = manager.email;
      session.operatorName = manager.name;
      session.updatedAt = now;
    }
  }
  await appendMessage({ sessionId, role: "system", content: `${manager.name} подключился к диалогу.` });
  return true;
}

export async function closeConversation(sessionId: string, managerName: string) {
  const current = await getConversation(sessionId);
  if (!current || current.status === "CLOSED") return false;
  await closeSession(sessionId, managerName);
  await appendMessage({ sessionId, role: "system", content: "Спасибо за обращение. Оцените консультацию." });
  return true;
}

export async function clearConversationMessages(sessionId: string) {
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    await db.prepare("DELETE FROM chat_messages WHERE session_id = ?").bind(sessionId).run();
  } else {
    memoryStore().messages = memoryStore().messages.filter((message) => message.sessionId !== sessionId);
  }
  await touchSession(sessionId);
}

export async function archiveConversation(sessionId: string) {
  const now = new Date().toISOString();
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    await db.prepare("UPDATE chat_sessions SET archived_at = ?, updated_at = ? WHERE id = ?").bind(now, now, sessionId).run();
  } else {
    const session = memoryStore().sessions.find((item) => item.id === sessionId);
    if (session) { session.archivedAt = now; session.updatedAt = now; }
  }
}

export async function deleteConversation(sessionId: string) {
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    await db.batch([
      db.prepare("DELETE FROM chat_messages WHERE session_id = ?").bind(sessionId),
      db.prepare("DELETE FROM chat_ratings WHERE conversation_id = ?").bind(sessionId),
      db.prepare("DELETE FROM chat_sessions WHERE id = ?").bind(sessionId),
    ]);
  } else {
    const store = memoryStore();
    store.messages = store.messages.filter((item) => item.sessionId !== sessionId);
    store.ratings = store.ratings.filter((item) => item.conversationId !== sessionId);
    store.sessions = store.sessions.filter((item) => item.id !== sessionId);
  }
}

export type ChatCommandRecord = { id: string; name: string; command: string; response: string; enabled: boolean; createdAt: string; updatedAt: string };

export async function listChatCommands() {
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const result = await db.prepare("SELECT * FROM chat_commands ORDER BY command ASC").all<D1ChatCommand>();
    return (result.results ?? []).map(mapD1Command);
  }
  return [...memoryStore().commands].sort((a, b) => a.command.localeCompare(b.command));
}

export async function findChatCommand(value: string) {
  const command = normalizeCommand(value);
  return (await listChatCommands()).find((item) => item.enabled && item.command === command) ?? null;
}

export async function saveChatCommand(input: { id?: string; name: string; command: string; response: string; enabled?: boolean }) {
  const name = input.name.trim();
  const command = normalizeCommand(input.command);
  const response = input.response.trim();
  if (!name || !/^\/[\p{L}\p{N}_-]{1,40}$/u.test(command) || !response) throw new Error("invalid command");
  const now = new Date().toISOString();
  const record: ChatCommandRecord = { id: input.id || randomId("command"), name, command, response, enabled: input.enabled !== false, createdAt: now, updatedAt: now };
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const existing = input.id ? await db.prepare("SELECT created_at FROM chat_commands WHERE id = ?").bind(input.id).first<{ created_at: string }>() : null;
    record.createdAt = existing?.created_at ?? now;
    if (existing) await db.prepare("UPDATE chat_commands SET name = ?, command = ?, response = ?, enabled = ?, updated_at = ? WHERE id = ?").bind(name, command, response, record.enabled ? 1 : 0, now, record.id).run();
    else await db.prepare("INSERT INTO chat_commands (id, name, command, response, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(record.id, name, command, response, record.enabled ? 1 : 0, now, now).run();
    return record;
  }
  const store = memoryStore();
  const index = store.commands.findIndex((item) => item.id === record.id);
  if (index >= 0) { record.createdAt = store.commands[index].createdAt; store.commands[index] = record; } else store.commands.push(record);
  return record;
}

export async function deleteChatCommand(id: string) {
  const db = await getDatabase();
  if (db) { await ensureD1Schema(db); await db.prepare("DELETE FROM chat_commands WHERE id = ?").bind(id).run(); return; }
  memoryStore().commands = memoryStore().commands.filter((item) => item.id !== id);
}

export async function addChatRating(input: { conversationId: string; customerToken: string; rating: number; comment?: string }) {
  const session = await getCustomerSession(input.conversationId, input.customerToken);
  if (!session || session.status !== "CLOSED") return { ok: false as const, reason: "conversation is not closed" };
  if (input.rating < 1 || input.rating > 5) return { ok: false as const, reason: "rating must be 1-5" };

  const existing = await getRating(input.conversationId);
  if (existing) return { ok: false as const, reason: "rating already exists" };

  const rating: ChatRatingRecord = {
    id: randomId("rating"),
    conversationId: input.conversationId,
    rating: Math.round(input.rating),
    comment: input.comment?.trim() ?? "",
    employeeId: session.operatorId,
    createdAt: new Date().toISOString(),
  };

  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    await db.prepare(
      "INSERT INTO chat_ratings (id, conversation_id, rating, comment, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(rating.id, rating.conversationId, rating.rating, rating.comment, rating.employeeId, rating.createdAt).run();
    return { ok: true as const, rating };
  }

  memoryStore().ratings.push(rating);
  return { ok: true as const, rating };
}

export async function listChatRatings(filter?: { rating?: number; employeeId?: string }) {
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const result = await db.prepare("SELECT * FROM chat_ratings ORDER BY created_at DESC LIMIT 200").all<D1ChatRating>();
    return (result.results ?? [])
      .map(mapD1Rating)
      .filter((item) => (!filter?.rating || item.rating === filter.rating) && (!filter?.employeeId || item.employeeId === filter.employeeId));
  }

  return memoryStore().ratings
    .filter((item) => (!filter?.rating || item.rating === filter.rating) && (!filter?.employeeId || item.employeeId === filter.employeeId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function getRating(conversationId: string) {
  const db = await getDatabase();
  if (db) {
    await ensureD1Schema(db);
    const row = await db.prepare("SELECT * FROM chat_ratings WHERE conversation_id = ?").bind(conversationId).first<D1ChatRating>();
    return row ? mapD1Rating(row) : null;
  }

  return memoryStore().ratings.find((rating) => rating.conversationId === conversationId) ?? null;
}

async function closeSession(sessionId: string, managerName: string) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  if (db) {
    await ensureD1Schema(db);
    await db.prepare("UPDATE chat_sessions SET status = ?, closed_at = ?, closed_by = ?, updated_at = ? WHERE id = ?").bind("CLOSED", now, managerName, now, sessionId).run();
    return;
  }

  const session = memoryStore().sessions.find((item) => item.id === sessionId);
  if (session) {
    session.status = "CLOSED";
    session.closedAt = now;
    session.closedBy = managerName;
    session.updatedAt = now;
  }
}

export async function updateSessionStatus(sessionId: string, status: ChatStatus) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  if (db) {
    await ensureD1Schema(db);
    await db.prepare("UPDATE chat_sessions SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, sessionId).run();
    return;
  }

  const session = memoryStore().sessions.find((item) => item.id === sessionId);
  if (session) {
    session.status = status;
    session.updatedAt = now;
  }
}

async function touchSession(sessionId: string) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  if (db) {
    await ensureD1Schema(db);
    await db.prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ?").bind(now, sessionId).run();
    return;
  }

  const session = memoryStore().sessions.find((item) => item.id === sessionId);
  if (session) session.updatedAt = now;
}

function createNewSession(input: CustomerSessionInput): ChatSessionRecord {
  const now = new Date().toISOString();
  return {
    id: randomId("chat"),
    status: "NEW",
    page: input.page ?? "",
    source: input.source ?? readSource(input.attribution),
    attribution: input.attribution ?? {},
    customerToken: randomId("customer"),
    operatorId: null,
    operatorName: null,
    closedAt: null,
    closedBy: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureD1Schema(db: D1DatabaseLike) {
  const store = memoryStore();
  if (store.schemaReady) return;

  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS chat_sessions (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'NEW', page TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'Direct', customer_token TEXT NOT NULL DEFAULT '', operator_id TEXT, operator_name TEXT, attribution TEXT NOT NULL DEFAULT '{}', contact TEXT, closed_at TEXT, closed_by TEXT, archived_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, author_name TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS chat_ratings (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '', employee_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS operators (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'MANAGER', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS operator_sessions (id TEXT PRIMARY KEY, operator_id TEXT NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS chat_commands (id TEXT PRIMARY KEY, name TEXT NOT NULL, command TEXT NOT NULL UNIQUE, response TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_chat_sessions_status_updated ON chat_sessions(status, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_operators_email ON operators(email)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_ratings_conversation ON chat_ratings(conversation_id)"),
  ]);

  const columns = await db.prepare("PRAGMA table_info(chat_sessions)").all<{ name: string }>();
  if (!(columns.results ?? []).some((column) => column.name === "closed_at")) await db.prepare("ALTER TABLE chat_sessions ADD COLUMN closed_at TEXT").run();
  if (!(columns.results ?? []).some((column) => column.name === "closed_by")) await db.prepare("ALTER TABLE chat_sessions ADD COLUMN closed_by TEXT").run();
  if (!(columns.results ?? []).some((column) => column.name === "archived_at")) await db.prepare("ALTER TABLE chat_sessions ADD COLUMN archived_at TEXT").run();
  await db.prepare("UPDATE chat_sessions SET status = 'NEW' WHERE status IN ('AUTO', 'AI')").run();
  await db.prepare("UPDATE chat_sessions SET status = 'WAITING_MANAGER' WHERE status = 'WAITING_OPERATOR'").run();
  await db.prepare("UPDATE chat_sessions SET status = 'IN_PROGRESS' WHERE status = 'OPERATOR'").run();
  for (const command of defaultCommands()) {
    await db.prepare("INSERT OR IGNORE INTO chat_commands (id, name, command, response, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(command.id, command.name, command.command, command.response, 1, command.createdAt, command.updatedAt).run();
  }

  store.schemaReady = true;
}

type D1ChatSession = {
  id: string;
  status: ChatStatus;
  page: string;
  source: string;
  attribution: string;
  customer_token: string;
  operator_id: string | null;
  operator_name: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

type D1ChatCommand = { id: string; name: string; command: string; response: string; enabled: number; created_at: string; updated_at: string };

type D1ChatRating = {
  id: string;
  conversation_id: string;
  rating: number;
  comment: string;
  employee_id: string | null;
  created_at: string;
};

type D1ChatMessage = {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  author_name: string | null;
  created_at: string;
};

function mapD1Session(row: D1ChatSession): ChatSessionRecord {
  return {
    id: row.id,
    status: row.status,
    page: row.page,
    source: row.source,
    attribution: safeJson(row.attribution),
    customerToken: row.customer_token,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    closedAt: row.closed_at ?? null,
    closedBy: row.closed_by ?? null,
    archivedAt: row.archived_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapD1Command(row: D1ChatCommand): ChatCommandRecord {
  return { id: row.id, name: row.name, command: row.command, response: row.response, enabled: row.enabled === 1, createdAt: row.created_at, updatedAt: row.updated_at };
}

function normalizeCommand(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function defaultCommands(): ChatCommandRecord[] {
  const now = new Date().toISOString();
  return [
    { id: "command_hello", name: "Приветствие", command: "/прив", response: "Добрый день! Чем можем помочь?", enabled: true, createdAt: now, updatedAt: now },
    { id: "command_catalog", name: "Каталог", command: "/каталог", response: "Наш каталог фасадов и столешниц: /catalog", enabled: true, createdAt: now, updatedAt: now },
  ];
}

function mapD1Rating(row: D1ChatRating): ChatRatingRecord {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    rating: row.rating,
    comment: row.comment,
    employeeId: row.employee_id,
    createdAt: row.created_at,
  };
}

function mapD1Message(row: D1ChatMessage): ChatMessageRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

function readSource(attribution: unknown) {
  if (!attribution || typeof attribution !== "object") return "Direct";
  const value = attribution as { lastTouch?: { source?: string } };
  return value.lastTouch?.source || "Direct";
}

function safeJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}

function randomId(prefix: string) {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
