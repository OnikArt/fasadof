ALTER TABLE `leads` ADD COLUMN `deleted_at` text;
ALTER TABLE `leads` ADD COLUMN `deleted_by_id` text;
ALTER TABLE `leads` ADD COLUMN `deleted_by_name` text;
ALTER TABLE `leads` ADD COLUMN `deleted_by_email` text;

CREATE TABLE IF NOT EXISTS `lead_audit_events` (
  `id` text PRIMARY KEY NOT NULL,
  `lead_id` integer NOT NULL,
  `event_type` text NOT NULL,
  `actor_id` text NOT NULL,
  `actor_name` text NOT NULL,
  `actor_email` text NOT NULL,
  `previous_status` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_leads_deleted_created` ON `leads` (`deleted_at`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_lead_audit_lead_created` ON `lead_audit_events` (`lead_id`, `created_at`);
PRAGMA optimize;
