ALTER TABLE `schedule_items` ADD COLUMN `end_date` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `schedule_items` ADD COLUMN `activity_type` text DEFAULT 'Production' NOT NULL;
--> statement-breakpoint
ALTER TABLE `schedule_items` ADD COLUMN `actual_started_at` text;
--> statement-breakpoint
ALTER TABLE `schedule_items` ADD COLUMN `actual_finished_at` text;
