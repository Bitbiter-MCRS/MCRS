CREATE TABLE `activity_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activity_options_name_unique` ON `activity_options` (`name`);--> statement-breakpoint
ALTER TABLE `hourly_logs` ADD `machine_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `hourly_logs` ADD `downtime_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `schedule_items` ADD `shift` text DEFAULT 'Early' NOT NULL;--> statement-breakpoint
ALTER TABLE `schedule_items` ADD `target_kegs` integer DEFAULT 0 NOT NULL;