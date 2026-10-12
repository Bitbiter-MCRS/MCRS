ALTER TABLE `hourly_logs` ADD COLUMN `schedule_item_id` integer;
--> statement-breakpoint
CREATE TABLE `daily_priorities` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `priority_date` text NOT NULL,
  `priority_rank` integer NOT NULL,
  `content` text NOT NULL,
  `status` text DEFAULT 'Not Started' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_daily_priorities_date_rank` ON `daily_priorities` (`priority_date`, `priority_rank`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_hourly_logs_schedule_item_id` ON `hourly_logs` (`schedule_item_id`);
--> statement-breakpoint
PRAGMA optimize;
