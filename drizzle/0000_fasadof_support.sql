CREATE TABLE IF NOT EXISTS `leads` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `phone` text NOT NULL,
  `message` text DEFAULT '' NOT NULL,
  `product` text DEFAULT '' NOT NULL,
  `material` text DEFAULT '' NOT NULL,
  `area` text DEFAULT '' NOT NULL,
  `page` text DEFAULT '' NOT NULL,
  `attribution` text NOT NULL,
  `status` text DEFAULT 'new' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `chat_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `status` text DEFAULT 'AI' NOT NULL,
  `page` text DEFAULT '' NOT NULL,
  `source` text DEFAULT 'Direct' NOT NULL,
  `customer_token` text DEFAULT '' NOT NULL,
  `operator_id` text,
  `operator_name` text,
  `attribution` text DEFAULT '{}' NOT NULL,
  `contact` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `role` text NOT NULL,
  `content` text NOT NULL,
  `author_name` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `operators` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL,
  `password_hash` text NOT NULL,
  `role` text DEFAULT 'operator' NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `operator_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `operator_id` text NOT NULL,
  `token_hash` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_leads_status_created` ON `leads` (`status`, `created_at`);
CREATE INDEX IF NOT EXISTS `idx_chat_sessions_status_updated` ON `chat_sessions` (`status`, `updated_at`);
CREATE INDEX IF NOT EXISTS `idx_chat_messages_session_created` ON `chat_messages` (`session_id`, `created_at`);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_operators_email` ON `operators` (`email`);
PRAGMA optimize;
