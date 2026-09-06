export type PreparedStatementLike = {
  bind(...values: unknown[]): PreparedStatementLike;
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  runSync?: () => unknown;
};

export type DatabaseLike = {
  prepare(query: string): PreparedStatementLike;
  batch(statements: PreparedStatementLike[]): Promise<unknown>;
};

type DatabaseGlobal = typeof globalThis & {
  __fasadofDatabasePromise?: Promise<DatabaseLike | undefined>;
};

const databaseGlobal = globalThis as DatabaseGlobal;

export async function getDatabase(): Promise<DatabaseLike | undefined> {
  if (!databaseGlobal.__fasadofDatabasePromise) {
    databaseGlobal.__fasadofDatabasePromise = resolveDatabase();
  }
  return databaseGlobal.__fasadofDatabasePromise;
}

async function resolveDatabase() {
  const cloudflare = await getCloudflareDatabase();
  if (cloudflare) return cloudflare;
  if (!process.versions?.node) return undefined;
  return createNodeSqliteDatabase();
}

async function getCloudflareDatabase() {
  try {
    const cloudflareWorkers = "cloudflare:workers";
    const mod = await import(/* @vite-ignore */ cloudflareWorkers) as { env?: { DB?: DatabaseLike } };
    return mod.env?.DB;
  } catch {
    return undefined;
  }
}

async function createNodeSqliteDatabase(): Promise<DatabaseLike | undefined> {
  try {
    const sqliteModule = "node:sqlite";
    const fsModule = "node:fs";
    const pathModule = "node:path";
    const [{ DatabaseSync }, { mkdirSync }, { join, resolve }] = await Promise.all([
      import(/* @vite-ignore */ sqliteModule) as Promise<{
        DatabaseSync: new (path: string) => {
          exec(sql: string): void;
          prepare(sql: string): {
            run(...values: unknown[]): unknown;
            get(...values: unknown[]): unknown;
            all(...values: unknown[]): unknown[];
          };
        };
      }>,
      import(/* @vite-ignore */ fsModule) as Promise<{ mkdirSync(path: string, options: { recursive: boolean }): void }>,
      import(/* @vite-ignore */ pathModule) as Promise<{ join(...parts: string[]): string; resolve(path: string): string }>,
    ]);

    const dataDir = resolve(process.env.FASADOF_DATA_DIR || join(process.cwd(), ".data"));
    mkdirSync(dataDir, { recursive: true });
    const database = new DatabaseSync(join(dataDir, "fasadof.sqlite"));
    database.exec("PRAGMA journal_mode = WAL");
    database.exec("PRAGMA foreign_keys = ON");
    database.exec("PRAGMA busy_timeout = 5000");

    return {
      prepare(query: string) {
        let values: unknown[] = [];
        const wrapper: PreparedStatementLike = {
          bind(...nextValues: unknown[]) {
            values = nextValues;
            return wrapper;
          },
          async run() {
            return database.prepare(query).run(...values);
          },
          async first<T>() {
            return (database.prepare(query).get(...values) as T | undefined) ?? null;
          },
          async all<T>() {
            return { results: database.prepare(query).all(...values) as T[] };
          },
          runSync() {
            return database.prepare(query).run(...values);
          },
        };
        return wrapper;
      },
      async batch(statements) {
        database.exec("BEGIN IMMEDIATE");
        try {
          for (const statement of statements) {
            if (!statement.runSync) throw new Error("Unsupported statement in SQLite batch");
            statement.runSync();
          }
          database.exec("COMMIT");
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        }
      },
    };
  } catch (error) {
    console.error("Persistent SQLite storage is unavailable", error);
    return undefined;
  }
}
