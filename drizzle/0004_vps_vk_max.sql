ALTER TABLE `products` ADD COLUMN `old_price` integer;
ALTER TABLE `products` ADD COLUMN `vk_owner_id` integer;
ALTER TABLE `products` ADD COLUMN `vk_market_item_id` integer;
ALTER TABLE `products` ADD COLUMN `vk_url` text;
ALTER TABLE `products` ADD COLUMN `vk_synced_at` text;

CREATE UNIQUE INDEX IF NOT EXISTS `idx_products_vk_market_item`
  ON `products` (`vk_owner_id`, `vk_market_item_id`)
  WHERE `vk_market_item_id` IS NOT NULL;

CREATE TABLE IF NOT EXISTS `integration_events` (
  `id` text PRIMARY KEY NOT NULL,
  `provider` text NOT NULL,
  `event_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_integration_events_provider_created`
  ON `integration_events` (`provider`, `created_at`);
