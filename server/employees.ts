import { hashPassword } from "@/server/password";
import { listChatRatings, listConversations } from "@/server/support-store";

export type EmployeeRole = "ADMIN" | "MANAGER";

export type EmployeeRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: EmployeeRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type PublicEmployee = Omit<EmployeeRecord, "passwordHash"> & {
  averageRating: number | null;
  ratingCount: number;
  dialogCount: number;
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

type EmployeeMemoryStore = {
  employees: EmployeeRecord[];
  schemaReady: boolean;
};

const globalStore = globalThis as typeof globalThis & { __fasadofEmployees?: EmployeeMemoryStore };

function memoryStore() {
  if (!globalStore.__fasadofEmployees) globalStore.__fasadofEmployees = { employees: [], schemaReady: false };
  return globalStore.__fasadofEmployees;
}

async function getD1() {
  try {
    const mod = await import("cloudflare:workers");
    return mod.env.DB as unknown as D1DatabaseLike | undefined;
  } catch {
    return undefined;
  }
}

export async function listEmployees(env = process.env) {
  const employees = await readEmployees();
  const withStats = await Promise.all(employees.map(toPublicEmployee));
  const hasConfiguredAdmin = withStats.some((employee) => employee.email.toLowerCase() === env.ADMIN_EMAIL?.toLowerCase());

  if (!hasConfiguredAdmin && env.ADMIN_EMAIL) {
    withStats.unshift({
      id: "env-admin",
      name: env.ADMIN_NAME || "Администратор",
      email: env.ADMIN_EMAIL,
      role: "ADMIN",
      isActive: true,
      createdAt: "",
      updatedAt: "",
      lastLoginAt: null,
      averageRating: null,
      ratingCount: 0,
      dialogCount: 0,
    });
  }

  return withStats;
}

export async function getEmployeeByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const db = await getD1();
  if (db) {
    await ensureEmployeeSchema(db);
    const row = await db.prepare("SELECT * FROM operators WHERE lower(email) = lower(?) LIMIT 1").bind(normalized).first<D1Employee>();
    return row ? mapEmployee(row) : null;
  }

  return memoryStore().employees.find((employee) => employee.email.toLowerCase() === normalized) ?? null;
}

export async function createEmployee(input: { name: string; email: string; password: string; role: EmployeeRole }) {
  const now = new Date().toISOString();
  const employee: EmployeeRecord = {
    id: randomId("emp"),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash: await hashPassword(input.password),
    role: input.role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };

  const db = await getD1();
  if (db) {
    await ensureEmployeeSchema(db);
    await db.prepare(
      "INSERT INTO operators (id, name, email, password_hash, role, is_active, created_at, updated_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(employee.id, employee.name, employee.email, employee.passwordHash, employee.role, 1, employee.createdAt, employee.updatedAt, null).run();
    return toPublicEmployee(employee);
  }

  if (memoryStore().employees.some((item) => item.email === employee.email)) {
    throw new Error("Employee email already exists");
  }
  memoryStore().employees.unshift(employee);
  return toPublicEmployee(employee);
}

export async function updateEmployee(id: string, input: Partial<{ name: string; email: string; role: EmployeeRole; isActive: boolean; password: string }>) {
  const db = await getD1();
  const current = await getEmployeeById(id);
  if (!current) return null;

  const next: EmployeeRecord = {
    ...current,
    name: input.name?.trim() || current.name,
    email: input.email?.trim().toLowerCase() || current.email,
    role: input.role ?? current.role,
    isActive: typeof input.isActive === "boolean" ? input.isActive : current.isActive,
    passwordHash: input.password ? await hashPassword(input.password) : current.passwordHash,
    updatedAt: new Date().toISOString(),
  };

  if (db) {
    await ensureEmployeeSchema(db);
    await db.prepare(
      "UPDATE operators SET name = ?, email = ?, role = ?, is_active = ?, password_hash = ?, updated_at = ? WHERE id = ?",
    ).bind(next.name, next.email, next.role, next.isActive ? 1 : 0, next.passwordHash, next.updatedAt, id).run();
    return toPublicEmployee(next);
  }

  const index = memoryStore().employees.findIndex((employee) => employee.id === id);
  if (index >= 0) memoryStore().employees[index] = next;
  return toPublicEmployee(next);
}

export async function updateEmployeeLastLogin(id: string) {
  const now = new Date().toISOString();
  const db = await getD1();
  if (db) {
    await ensureEmployeeSchema(db);
    await db.prepare("UPDATE operators SET last_login_at = ?, updated_at = ? WHERE id = ?").bind(now, now, id).run();
    return;
  }

  const employee = memoryStore().employees.find((item) => item.id === id);
  if (employee) {
    employee.lastLoginAt = now;
    employee.updatedAt = now;
  }
}

async function readEmployees() {
  const db = await getD1();
  if (db) {
    await ensureEmployeeSchema(db);
    const result = await db.prepare("SELECT * FROM operators ORDER BY created_at DESC").all<D1Employee>();
    return (result.results ?? []).map(mapEmployee);
  }

  return [...memoryStore().employees];
}

async function getEmployeeById(id: string) {
  const db = await getD1();
  if (db) {
    await ensureEmployeeSchema(db);
    const row = await db.prepare("SELECT * FROM operators WHERE id = ?").bind(id).first<D1Employee>();
    return row ? mapEmployee(row) : null;
  }

  return memoryStore().employees.find((employee) => employee.id === id) ?? null;
}

async function toPublicEmployee(employee: EmployeeRecord): Promise<PublicEmployee> {
  const [ratings, dialogs] = await Promise.all([
    listChatRatings({ employeeId: employee.email }),
    listConversations("ALL"),
  ]);
  const ratingTotal = ratings.reduce((sum, item) => sum + item.rating, 0);

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    isActive: employee.isActive,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    lastLoginAt: employee.lastLoginAt,
    averageRating: ratings.length ? ratingTotal / ratings.length : null,
    ratingCount: ratings.length,
    dialogCount: dialogs.filter((dialog) => dialog.operatorId === employee.email).length,
  };
}

async function ensureEmployeeSchema(db: D1DatabaseLike) {
  const store = memoryStore();
  if (store.schemaReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS operators (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'MANAGER', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_login_at TEXT)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_operators_email ON operators(email)"),
  ]);
  store.schemaReady = true;
}

type D1Employee = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

function mapEmployee(row: D1Employee): EmployeeRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role === "ADMIN" ? "ADMIN" : "MANAGER",
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function randomId(prefix: string) {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
