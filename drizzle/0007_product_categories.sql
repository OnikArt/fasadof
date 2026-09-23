CREATE TABLE IF NOT EXISTS product_categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO product_categories (slug, name, description) VALUES ('facades', 'Мебельные фасады', 'Фасады и декоративные панели');
INSERT OR IGNORE INTO product_categories (slug, name, description) VALUES ('countertops', 'Столешницы', 'Рабочие поверхности и компакт-плиты');
