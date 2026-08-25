CREATE TABLE `site_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_json` text NOT NULL,
	`projects_json` text NOT NULL,
	`updated_by` int NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_drafts_id` PRIMARY KEY(`id`)
);
