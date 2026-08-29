ALTER TABLE `chat_sessions` ADD COLUMN `closed_at` text;
ALTER TABLE `chat_sessions` ADD COLUMN `closed_by` text;
ALTER TABLE `operators` ADD COLUMN `last_login_at` text;

CREATE TABLE IF NOT EXISTS `chat_ratings` (
  `id` text PRIMARY KEY NOT NULL,
  `conversation_id` text NOT NULL,
  `rating` integer NOT NULL,
  `comment` text DEFAULT '' NOT NULL,
  `employee_id` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_chat_ratings_conversation` ON `chat_ratings` (`conversation_id`);
CREATE INDEX IF NOT EXISTS `idx_chat_ratings_employee_created` ON `chat_ratings` (`employee_id`, `created_at`);
PRAGMA optimize;
