import { getDatabase } from "@/server/database";

export type ProductCategoryRecord = { slug: string; name: string; description: string; createdAt: string; updatedAt: string };
const fallback: ProductCategoryRecord[] = [
  { slug: "facades", name: "Мебельные фасады", description: "Фасады и декоративные панели", createdAt: "", updatedAt: "" },
  { slug: "countertops", name: "Столешницы", description: "Рабочие поверхности и компакт-плиты", createdAt: "", updatedAt: "" },
];
let memory = [...fallback];

export async function listCategories() {
  const db = await getDatabase();
  if (!db) return memory;
  await ensure(db);
  const result = await db.prepare("SELECT * FROM product_categories ORDER BY name").all<Row>();
  return (result.results ?? []).map(mapRow);
}

export async function saveCategory(input: { originalSlug?: string; slug: string; name: string; description?: string }) {
  const slug = (input.originalSlug || input.slug).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const name = input.name.trim();
  if (!slug || !name) throw new Error("slug and name are required");
  const now = new Date().toISOString();
  const db = await getDatabase();
  if (db) {
    await ensure(db);
    const current = input.originalSlug ? await db.prepare("SELECT slug, created_at FROM product_categories WHERE slug = ?").bind(input.originalSlug).first<{ slug: string; created_at: string }>() : null;
    if (current) await db.prepare("UPDATE product_categories SET slug = ?, name = ?, description = ?, updated_at = ? WHERE slug = ?").bind(slug, name, input.description?.trim() || "", now, input.originalSlug).run();
    else await db.prepare("INSERT INTO product_categories (slug, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(slug, name, input.description?.trim() || "", now, now).run();
  } else {
    const item = { slug, name, description: input.description?.trim() || "", createdAt: now, updatedAt: now };
    const index = memory.findIndex((value) => value.slug === input.originalSlug);
    if (index >= 0) memory[index] = { ...item, createdAt: memory[index].createdAt || now };
    else memory.push(item);
  }
  return listCategories();
}

export async function deleteCategory(slug: string) {
  const db = await getDatabase();
  if (db) {
    await ensure(db);
    const used = await db.prepare("SELECT id FROM products WHERE category = ? LIMIT 1").bind(slug).first<{ id: string }>();
    if (used) throw new Error("Сначала перенесите товары в другую категорию");
    await db.prepare("DELETE FROM product_categories WHERE slug = ?").bind(slug).run();
  } else memory = memory.filter((item) => item.slug !== slug);
  return listCategories();
}

async function ensure(db: Awaited<ReturnType<typeof getDatabase>> & {}) {
  await db.batch([db.prepare("CREATE TABLE IF NOT EXISTS product_categories (slug TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")]);
  const found = await db.prepare("SELECT slug FROM product_categories LIMIT 1").first<{ slug: string }>();
  if (!found) for (const item of fallback) await db.prepare("INSERT INTO product_categories (slug, name, description) VALUES (?, ?, ?)").bind(item.slug, item.name, item.description).run();
}
type Row = { slug: string; name: string; description: string; created_at: string; updated_at: string };
function mapRow(row: Row): ProductCategoryRecord { return { slug: row.slug, name: row.name, description: row.description, createdAt: row.created_at, updatedAt: row.updated_at }; }
