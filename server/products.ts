import { products as seedProducts, type Product, type ProductCategory } from "@/data/products";
import { getDatabase } from "@/server/database";
import { listCategories } from "@/server/categories";

export type ProductStatus = "published" | "hidden" | "archived";

export type ProductInput = {
  id?: string;
  slug: string;
  category: ProductCategory;
  material: string;
  name: string;
  shortName?: string;
  description: string;
  fullDescription?: string;
  priceFrom?: number | null;
  oldPrice?: number | null;
  pricePrefix?: string;
  priceUnit?: string;
  priceOnRequest?: boolean;
  image: string;
  texture: string;
  gallery?: string[];
  features?: string[];
  application?: string;
  popular?: boolean;
  status?: ProductStatus;
  vkOwnerId?: number | null;
  vkMarketItemId?: number | null;
  vkUrl?: string;
  vkSyncedAt?: string;
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

type ProductMemoryStore = {
  products: Product[];
  schemaReady: boolean;
};

const globalStore = globalThis as typeof globalThis & { __fasadofProducts?: ProductMemoryStore };

function memoryStore() {
  if (!globalStore.__fasadofProducts) {
    const now = new Date().toISOString();
    globalStore.__fasadofProducts = {
      products: seedProducts.map((product) => ({
        ...product,
        status: product.status ?? "published",
        fullDescription: product.fullDescription ?? product.description,
        pricePrefix: product.pricePrefix ?? "от",
        createdAt: product.createdAt ?? now,
        updatedAt: product.updatedAt ?? now,
        createdBy: product.createdBy ?? "seed",
        updatedBy: product.updatedBy ?? "seed",
      })),
      schemaReady: false,
    };
  }
  return globalStore.__fasadofProducts;
}

export async function listProducts(options: { includeHidden?: boolean; status?: ProductStatus | "all" } = {}) {
  const db = await getDatabase();
  if (db) {
    await ensureProductSchema(db);
    await seedD1Products(db);
    const result = await db.prepare("SELECT * FROM products ORDER BY updated_at DESC").all<D1Product>();
    return (result.results ?? [])
      .map(mapD1Product)
      .filter((product) => filterProduct(product, options));
  }

  return memoryStore().products
    .filter((product) => filterProduct(product, options))
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export async function listPublicProducts() {
  return listProducts({ status: "published" });
}

export async function getProductBySlug(slug: string, options: { includeHidden?: boolean } = {}) {
  const products = await listProducts({ includeHidden: options.includeHidden, status: options.includeHidden ? "all" : "published" });
  return products.find((product) => product.slug === slug) ?? null;
}

export async function saveProduct(input: ProductInput, manager: { email: string; name: string }) {
  const categoryExists = (await listCategories()).some((category) => category.slug === input.category);
  if (!categoryExists) throw new Error("category does not exist");
  const now = new Date().toISOString();
  const existing = input.id ? await getProductById(input.id) : null;
  const product = normalizeProductInput(input, existing, manager, now);

  const db = await getDatabase();
  if (db) {
    await ensureProductSchema(db);
    await seedD1Products(db);
    if (existing) {
      await db.prepare(
        "UPDATE products SET slug = ?, category = ?, material = ?, name = ?, short_name = ?, description = ?, full_description = ?, price_from = ?, old_price = ?, price_prefix = ?, price_unit = ?, price_on_request = ?, image = ?, texture = ?, gallery = ?, features = ?, application = ?, popular = ?, status = ?, vk_owner_id = ?, vk_market_item_id = ?, vk_url = ?, vk_synced_at = ?, updated_by = ?, updated_at = ? WHERE id = ?",
      ).bind(
        product.slug,
        product.category,
        product.material,
        product.name,
        product.shortName ?? null,
        product.description,
        product.fullDescription ?? product.description,
        product.priceFrom ?? null,
        product.oldPrice ?? null,
        product.pricePrefix ?? "от",
        product.priceUnit ?? null,
        product.priceOnRequest ? 1 : 0,
        product.image,
        product.texture,
        JSON.stringify(product.gallery ?? []),
        JSON.stringify(product.features ?? []),
        product.application ?? null,
        product.popular ? 1 : 0,
        product.status ?? "published",
        product.vkOwnerId ?? null,
        product.vkMarketItemId ?? null,
        product.vkUrl ?? null,
        product.vkSyncedAt ?? null,
        product.updatedBy,
        product.updatedAt,
        product.id,
      ).run();
    } else {
      await db.prepare(
        "INSERT INTO products (id, slug, category, material, name, short_name, description, full_description, price_from, old_price, price_prefix, price_unit, price_on_request, image, texture, gallery, features, application, popular, status, vk_owner_id, vk_market_item_id, vk_url, vk_synced_at, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        product.id,
        product.slug,
        product.category,
        product.material,
        product.name,
        product.shortName ?? null,
        product.description,
        product.fullDescription ?? product.description,
        product.priceFrom ?? null,
        product.oldPrice ?? null,
        product.pricePrefix ?? "от",
        product.priceUnit ?? null,
        product.priceOnRequest ? 1 : 0,
        product.image,
        product.texture,
        JSON.stringify(product.gallery ?? []),
        JSON.stringify(product.features ?? []),
        product.application ?? null,
        product.popular ? 1 : 0,
        product.status ?? "published",
        product.vkOwnerId ?? null,
        product.vkMarketItemId ?? null,
        product.vkUrl ?? null,
        product.vkSyncedAt ?? null,
        product.createdBy,
        product.updatedBy,
        product.createdAt,
        product.updatedAt,
      ).run();
    }
    await recordProductChange(db, product, manager, existing ? "update" : "create");
    return product;
  }

  const store = memoryStore();
  const index = store.products.findIndex((item) => item.id === product.id);
  if (index >= 0) store.products[index] = product;
  else store.products.unshift(product);
  return product;
}

export async function setProductStatus(id: string, status: ProductStatus, manager: { email: string; name: string }) {
  const current = await getProductById(id);
  if (!current) return null;
  return saveProduct({ ...current, status }, manager);
}

export async function deleteProduct(id: string) {
  const db = await getDatabase();
  if (db) {
    await ensureProductSchema(db);
    await seedD1Products(db);
    await db.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
    return true;
  }

  const store = memoryStore();
  const before = store.products.length;
  store.products = store.products.filter((product) => product.id !== id);
  return store.products.length < before;
}

export async function getProductById(id: string) {
  const db = await getDatabase();
  if (db) {
    await ensureProductSchema(db);
    await seedD1Products(db);
    const row = await db.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<D1Product>();
    return row ? mapD1Product(row) : null;
  }

  return memoryStore().products.find((product) => product.id === id) ?? null;
}

function filterProduct(product: Product, options: { includeHidden?: boolean; status?: ProductStatus | "all" }) {
  if (options.status && options.status !== "all") return (product.status ?? "published") === options.status;
  return options.includeHidden || (product.status ?? "published") === "published";
}

function normalizeProductInput(input: ProductInput, existing: Product | null, manager: { email: string; name: string }, now: string): Product {
  const name = input.name.trim();
  const slug = normalizeSlug(input.slug || name);
  if (!name || !slug || !input.category || !input.material.trim() || !input.description.trim()) {
    throw new Error("name, slug, category, material and description are required");
  }

  return {
    id: existing?.id ?? input.id ?? randomId("product"),
    slug,
    category: input.category,
    material: input.material.trim(),
    name,
    shortName: input.shortName?.trim() || undefined,
    description: input.description.trim(),
    fullDescription: input.fullDescription?.trim() || input.description.trim(),
    priceFrom: input.priceOnRequest ? undefined : normalizePrice(input.priceFrom),
    oldPrice: normalizePrice(input.oldPrice) ?? existing?.oldPrice,
    pricePrefix: input.pricePrefix?.trim() || "от",
    priceUnit: input.priceOnRequest ? undefined : input.priceUnit?.trim() || undefined,
    priceOnRequest: Boolean(input.priceOnRequest),
    image: input.image?.trim() || existing?.image || "texture-custom",
    texture: input.texture?.trim() || existing?.texture || "custom",
    gallery: normalizeList(input.gallery),
    features: normalizeList(input.features),
    application: input.application?.trim() || undefined,
    popular: Boolean(input.popular),
    status: input.status ?? existing?.status ?? "published",
    vkOwnerId: input.vkOwnerId ?? existing?.vkOwnerId,
    vkMarketItemId: input.vkMarketItemId ?? existing?.vkMarketItemId,
    vkUrl: input.vkUrl?.trim() || existing?.vkUrl,
    vkSyncedAt: input.vkSyncedAt ?? existing?.vkSyncedAt,
    createdBy: existing?.createdBy ?? manager.email,
    updatedBy: manager.email,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function normalizePrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value)) || Number(value) <= 0) return undefined;
  return Math.round(Number(value));
}

function normalizeList(value: string[] | undefined) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function normalizeSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

async function ensureProductSchema(db: D1DatabaseLike) {
  const store = memoryStore();
  if (store.schemaReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, category TEXT NOT NULL, material TEXT NOT NULL, name TEXT NOT NULL, short_name TEXT, description TEXT NOT NULL, full_description TEXT, price_from INTEGER, old_price INTEGER, price_prefix TEXT NOT NULL DEFAULT 'от', price_unit TEXT, price_on_request INTEGER NOT NULL DEFAULT 0, image TEXT NOT NULL DEFAULT '', texture TEXT NOT NULL DEFAULT 'custom', gallery TEXT NOT NULL DEFAULT '[]', features TEXT NOT NULL DEFAULT '[]', application TEXT, popular INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'published', vk_owner_id INTEGER, vk_market_item_id INTEGER, vk_url TEXT, vk_synced_at TEXT, created_by TEXT, updated_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE TABLE IF NOT EXISTS product_change_log (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, action TEXT NOT NULL, manager_email TEXT NOT NULL, manager_name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_products_status_updated ON products(status, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category, status)"),
  ]);
  await ensureProductColumns(db);
  store.schemaReady = true;
}

async function ensureProductColumns(db: D1DatabaseLike) {
  const result = await db.prepare("PRAGMA table_info(products)").all<{ name: string }>();
  const columns = new Set((result.results ?? []).map((column) => column.name));
  const additions = [
    ["old_price", "INTEGER"],
    ["vk_owner_id", "INTEGER"],
    ["vk_market_item_id", "INTEGER"],
    ["vk_url", "TEXT"],
    ["vk_synced_at", "TEXT"],
  ] as const;
  for (const [name, type] of additions) {
    if (!columns.has(name)) await db.prepare(`ALTER TABLE products ADD COLUMN ${name} ${type}`).run();
  }
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_products_vk_market_item ON products(vk_owner_id, vk_market_item_id) WHERE vk_market_item_id IS NOT NULL").run();
}

async function seedD1Products(db: D1DatabaseLike) {
  const row = await db.prepare("SELECT id FROM products LIMIT 1").first<{ id: string }>();
  if (row) return;

  const now = new Date().toISOString();
  for (const product of seedProducts) {
    await db.prepare(
      "INSERT INTO products (id, slug, category, material, name, short_name, description, full_description, price_from, price_prefix, price_unit, price_on_request, image, texture, gallery, features, application, popular, status, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      product.id,
      product.slug,
      product.category,
      product.material,
      product.name,
      product.shortName ?? null,
      product.description,
      product.fullDescription ?? product.description,
      product.priceFrom ?? null,
      product.pricePrefix ?? "от",
      product.priceUnit ?? null,
      product.priceOnRequest ? 1 : 0,
      product.image,
      product.texture,
      JSON.stringify(product.gallery ?? []),
      JSON.stringify(product.features ?? []),
      product.application ?? null,
      product.popular ? 1 : 0,
      product.status ?? "published",
      "seed",
      "seed",
      now,
      now,
    ).run();
  }
}

async function recordProductChange(db: D1DatabaseLike, product: Product, manager: { email: string; name: string }, action: string) {
  await db.prepare(
    "INSERT INTO product_change_log (id, product_id, action, manager_email, manager_name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(randomId("change"), product.id, action, manager.email, manager.name, new Date().toISOString()).run();
}

type D1Product = {
  id: string;
  slug: string;
  category: ProductCategory;
  material: string;
  name: string;
  short_name: string | null;
  description: string;
  full_description: string | null;
  price_from: number | null;
  old_price: number | null;
  price_prefix: string | null;
  price_unit: string | null;
  price_on_request: number;
  image: string;
  texture: string;
  gallery: string;
  features: string;
  application: string | null;
  popular: number;
  status: ProductStatus;
  vk_owner_id: number | null;
  vk_market_item_id: number | null;
  vk_url: string | null;
  vk_synced_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

function mapD1Product(row: D1Product): Product {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    material: row.material,
    name: row.name,
    shortName: row.short_name ?? undefined,
    description: row.description,
    fullDescription: row.full_description ?? undefined,
    priceFrom: row.price_from ?? undefined,
    oldPrice: row.old_price ?? undefined,
    pricePrefix: row.price_prefix ?? "от",
    priceUnit: row.price_unit ?? undefined,
    priceOnRequest: row.price_on_request === 1,
    image: row.image,
    texture: row.texture,
    gallery: safeList(row.gallery),
    features: safeList(row.features),
    application: row.application ?? undefined,
    popular: row.popular === 1,
    status: row.status,
    vkOwnerId: row.vk_owner_id ?? undefined,
    vkMarketItemId: row.vk_market_item_id ?? undefined,
    vkUrl: row.vk_url ?? undefined,
    vkSyncedAt: row.vk_synced_at ?? undefined,
    createdBy: row.created_by ?? undefined,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function safeList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function randomId(prefix: string) {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
