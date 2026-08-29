ALTER TABLE `leads` ADD COLUMN `email` text DEFAULT '' NOT NULL;
UPDATE `leads` SET `status` = 'NEW' WHERE `status` = 'new';
