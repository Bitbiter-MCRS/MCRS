CREATE TABLE `safety_quality_issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issue_date` text NOT NULL,
	`shift` text NOT NULL,
	`issue_type` text NOT NULL,
	`severity` text DEFAULT 'Medium' NOT NULL,
	`description` text NOT NULL,
	`action` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
