ALTER TABLE `profile` ADD `reminder_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `reminder_time` text DEFAULT '08:00' NOT NULL;