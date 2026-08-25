CREATE TABLE `client_admin_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_salt` varchar(128) NOT NULL,
	`password_hash` varchar(256) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_admin_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_admin_accounts_email_unique` UNIQUE(`email`)
);
