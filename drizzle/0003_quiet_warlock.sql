CREATE TABLE `client_password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_admin_id` int NOT NULL,
	`token_hash` varchar(128) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_password_reset_tokens_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `client_password_reset_tokens` ADD CONSTRAINT `client_reset_tokens_admin_fk` FOREIGN KEY (`client_admin_id`) REFERENCES `client_admin_accounts`(`id`) ON DELETE cascade ON UPDATE no action;