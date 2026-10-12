CREATE INDEX IF NOT EXISTS `idx_hourly_logs_log_date` ON `hourly_logs` (`log_date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_safety_quality_issues_issue_date` ON `safety_quality_issues` (`issue_date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_schedule_items_schedule_date` ON `schedule_items` (`schedule_date`);
--> statement-breakpoint
PRAGMA optimize;
