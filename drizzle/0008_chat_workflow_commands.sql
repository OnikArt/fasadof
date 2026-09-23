ALTER TABLE `chat_sessions` ADD COLUMN `archived_at` text;
UPDATE `chat_sessions` SET `status` = 'NEW' WHERE `status` IN ('AUTO', 'AI');
UPDATE `chat_sessions` SET `status` = 'WAITING_MANAGER' WHERE `status` = 'WAITING_OPERATOR';
UPDATE `chat_sessions` SET `status` = 'IN_PROGRESS' WHERE `status` = 'OPERATOR';
CREATE TABLE IF NOT EXISTS `chat_commands` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `command` text NOT NULL UNIQUE,
  `response` text NOT NULL,
  `enabled` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT OR IGNORE INTO `chat_commands` (`id`, `name`, `command`, `response`, `enabled`) VALUES ('command_hello', 'Приветствие', '/прив', 'Добрый день! Чем можем помочь?', 1);
INSERT OR IGNORE INTO `chat_commands` (`id`, `name`, `command`, `response`, `enabled`) VALUES ('command_catalog', 'Каталог', '/каталог', 'Наш каталог фасадов и столешниц: /catalog', 1);
CREATE INDEX IF NOT EXISTS `idx_chat_sessions_archived_updated` ON `chat_sessions` (`archived_at`, `updated_at`);
