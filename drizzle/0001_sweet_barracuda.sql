CREATE TABLE `schedule_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`schedule_date` text NOT NULL,
	`day_name` text NOT NULL,
	`start_time` text DEFAULT '06:15' NOT NULL,
	`end_time` text DEFAULT '14:15' NOT NULL,
	`keg_format` text DEFAULT '30L' NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`job_number` text DEFAULT '' NOT NULL,
	`planned_minutes` integer DEFAULT 0 NOT NULL,
	`target_rate` integer DEFAULT 135 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `hourly_logs` ADD `activity_category` text DEFAULT 'Production' NOT NULL;--> statement-breakpoint
ALTER TABLE `hourly_logs` ADD `activity_minutes` integer DEFAULT 0 NOT NULL;