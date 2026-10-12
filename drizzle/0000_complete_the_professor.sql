CREATE TABLE `hourly_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`log_date` text NOT NULL,
	`shift` text NOT NULL,
	`time_slot` text NOT NULL,
	`keg_format` text NOT NULL,
	`target_kegs` integer DEFAULT 0 NOT NULL,
	`actual_kegs` integer DEFAULT 0 NOT NULL,
	`rejected_kegs` integer DEFAULT 0 NOT NULL,
	`reason_code` text DEFAULT '' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
