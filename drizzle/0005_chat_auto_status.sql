CREATE TABLE `chat_sessions_auto` (
  `id` text PRIMARY KEY NOT NULL,
  `status` text DEFAULT 'AUTO' NOT NULL,
  `page` text DEFAULT '' NOT NULL,
  `source` text DEFAULT 'Direct' NOT NULL,
  `customer_token` text DEFAULT '' NOT NULL,
  `operator_id` text,
  `operator_name` text,
  `attribution` text DEFAULT '{}' NOT NULL,
  `contact` text,
  `closed_at` text,
  `closed_by` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO `chat_sessions_auto` (
  `id`, `status`, `page`, `source`, `customer_token`, `operator_id`, `operator_name`,
  `attribution`, `contact`, `closed_at`, `closed_by`, `created_at`, `updated_at`
)
SELECT
  `id`, CASE WHEN `status` = 'AI' THEN 'AUTO' ELSE `status` END, `page`, `source`,
  `customer_token`, `operator_id`, `operator_name`, `attribution`, `contact`,
  `closed_at`, `closed_by`, `created_at`, `updated_at`
FROM `chat_sessions`;

DROP TABLE `chat_sessions`;
ALTER TABLE `chat_sessions_auto` RENAME TO `chat_sessions`;
CREATE INDEX IF NOT EXISTS `idx_chat_sessions_status_updated`
  ON `chat_sessions` (`status`, `updated_at`);
