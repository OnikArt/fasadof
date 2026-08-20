export type ChatStatus = "AI" | "WAITING_OPERATOR" | "OPERATOR" | "CLOSED";
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
  createdAt: string;
  updatedAt: string;
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
  schemaReady: boolean;
};

const globalStore = globalThis as typeof globalThis & { __fasadofSupportStore?: MemoryStore };

function memoryStore(): MemoryStore {
  if (!globalStore.__fasadofSupportStore) {
    globalStore.__fasadofSupportStore = { sessions: [], messages: [], schemaReady: false };
  }
  return globalStore.__fasadofSupportStore;
}

async function getD1() {
  try {
    const mod = await import("cloudflare:workers");
    return mod.env.DB as unknown as D1DatabaseLike | undefined;
  } catch {
    return undefined;
  }
}

export async function getOrCreateCustomerSession(input: CustomerSessionInput) {
  const db = await getD1();
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
  const db = await getD1();
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

  const db = await getD1();
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
  const db = await getD1();
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
  await updateSessionStatus(sessionId, "WAITING_OPERATOR");
  await appendMessage({
    sessionId,
    role: "system",
    content: "Диалог передан менеджеру. AI больше не отвечает в этом чате.",
  });
}

export async function listConversations(status?: ChatStatus | "ALL") {
  const db = await getD1();
  if (db) {
    await ensureD1Schema(db);
    const result = status && status !== "ALL"
      ? await db
        .prepare("SELECT * FROM chat_sessions WHERE status = ? ORDER BY updated_at DESC LIMIT 80")
        .bind(status)
        .all<D1ChatSession>()
      : await db
        .prepare("SELECT * FROM chat_sessions ORDER BY updated_at DESC LIMIT 80")
        .all<D1ChatSession>();
    return (result.results ?? []).map(mapD1Session);
  }

  const sessions = memoryStore().sessions;
  return sessions
    .filter((session) => !status || status === "ALL" || session.status === status)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 80);
}

export async function getConversation(sessionId: string) {
  const db = await getD1();
  if (db) {
    await ensureD1Schema(db);
    const session = await db.prepare("SELECT * FROM chat_sessions WHERE id = ?").bind(sessionId).first<D1ChatSession>();
    return session ? mapD1Session(session) : null;
  }

  return memoryStore().sessions.find((session) => session.id === sessionId) ?? null;
}

export async function takeConversation(sessionId: string, manager: { email: string; name: string }) {
  const db = await getD1();
  const now = new Date().toISOString();
  if (db) {
    await ensureD1Schema(db);
    await db
      .prepare("UPDATE chat_sessions SET status = ?, operator_id = ?, operator_name = ?, updated_at = ? WHERE id = ?")
      .bind("OPERATOR", manager.email, manager.name, now, sessionId)
      .run();
  } else {
    const session = memoryStore().sessions.find((item) => item.id === sessionId);
    if (session) {
      session.status = "OPERATOR";
      session.operatorId = manager.email;
      session.operatorName = manager.name;
      session.updatedAt = now;
    }
  }
  await appendMessage({ sessionId, role: "system", content: `${manager.name} взял диалог в работу.` });
}

export async function closeConversation(sessionId: string, managerName: string) {
  await updateSessionStatus(sessionId, "CLOSED");
  await appendMessage({ sessionId, role: "system", content: `${managerName} закрыл диалог.` });
}

export async function updateSessionStatus(sessionId: string, status: ChatStatus) {
  const db = await getD1();
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
  const db = await getD1();
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
    status: "AI",
    page: input.page ?? "",
    source: input.source ?? readSource(input.attribution),
    attribution: input.attribution ?? {},
    customerToken: randomId("customer"),
    operatorId: null,
    operatorName: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureD1Schema(db: D1DatabaseLike) {
  const store = memoryStore();
  if (store.schemaReady) return;

  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS chat_sessions (id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'AI', page TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'Direct', customer_token TEXT NOT NULL DEFAULT '', operator_id TEXT, operator_name TEXT, attribution TEXT NOT NULL DEFAULT '{}', contact TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, author_name TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS operators (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'operator', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS operator_sessions (id TEXT PRIMARY KEY, operator_id TEXT NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_chat_sessions_status_updated ON chat_sessions(status, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_operators_email ON operators(email)"),
  ]);

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
  created_at: string;
  updated_at: string;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
