CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`approver_user_id` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`name` text PRIMARY KEY NOT NULL,
	`menus_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
ALTER TABLE `assets` ADD `images_json` text;--> statement-breakpoint
ALTER TABLE `tickets` ADD `resolution_note` text;--> statement-breakpoint
ALTER TABLE `users` ADD `department_id` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `profile_picture` text;