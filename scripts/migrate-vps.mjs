import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = resolve(process.env.FASADOF_DATA_DIR || join(process.cwd(), ".data"));
mkdirSync(dataDir, { recursive: true });
const database = new DatabaseSync(join(dataDir, "fasadof.sqlite"));
database.exec("PRAGMA journal_mode = WAL");
database.exec("PRAGMA busy_timeout = 5000");
database.exec("CREATE TABLE IF NOT EXISTS _fasadof_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");

const migrations = readdirSync(resolve("drizzle"))
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .sort();
const applied = new Set(database.prepare("SELECT name FROM _fasadof_migrations").all().map((row) => row.name));

for (const name of migrations) {
  if (applied.has(name)) continue;
  const sql = readFileSync(join(resolve("drizzle"), name), "utf8");
  const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);

  database.exec("BEGIN IMMEDIATE");
  try {
    for (const statement of statements) {
      try {
        database.exec(statement);
      } catch (error) {
        if (!isAlreadyAppliedColumn(error, statement)) throw error;
      }
    }
    database.prepare("INSERT INTO _fasadof_migrations (name) VALUES (?)").run(name);
    database.exec("COMMIT");
    console.log(`Applied ${name}`);
  } catch (error) {
    database.exec("ROLLBACK");
    console.error(`Migration ${name} failed`);
    throw error;
  }
}

console.log("VPS database is up to date");

function isAlreadyAppliedColumn(error, statement) {
  return /^ALTER TABLE\s+/i.test(statement)
    && error instanceof Error
    && /duplicate column name/i.test(error.message);
}
