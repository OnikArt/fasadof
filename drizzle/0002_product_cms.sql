CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  material TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  description TEXT NOT NULL,
  full_description TEXT,
  price_from INTEGER,
  price_prefix TEXT NOT NULL DEFAULT 'от',
  price_unit TEXT,
  price_on_request INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL DEFAULT '',
  texture TEXT NOT NULL DEFAULT 'custom',
  gallery TEXT NOT NULL DEFAULT '[]',
  features TEXT NOT NULL DEFAULT '[]',
  application TEXT,
  popular INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_change_log (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  action TEXT NOT NULL,
  manager_email TEXT NOT NULL,
  manager_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_status_updated ON products(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category, status);
CREATE INDEX IF NOT EXISTS idx_product_change_log_product_created ON product_change_log(product_id, created_at);
