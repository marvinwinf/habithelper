CREATE TABLE `app_streak_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`current_streak` integer NOT NULL,
	`last_incremented_date` text NOT NULL,
	`reconciled_through_date` text NOT NULL,
	`recalculated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_color` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category_id` text,
	`schedule_type` text NOT NULL,
	`scheduled_weekdays` text,
	`weekly_target_count` integer,
	`time_of_day` text,
	`reason` text,
	`allow_conscious_skip` integer NOT NULL,
	`is_paused` integer NOT NULL,
	`sort_order` real NOT NULL,
	`color_variant_seed` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routine_event` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`occurrence_date` text NOT NULL,
	`event_type` text NOT NULL,
	`recorded_at` text NOT NULL,
	`moved_to_date` text,
	`skip_reason` text,
	`superseded_by_event_id` text,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`superseded_by_event_id`) REFERENCES `routine_event`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `routine_state_cache` (
	`routine_id` text PRIMARY KEY NOT NULL,
	`current_streak` integer NOT NULL,
	`best_streak` integer NOT NULL,
	`total_completions` integer NOT NULL,
	`level_rank` integer NOT NULL,
	`joker_inventory` integer NOT NULL,
	`joker_progress` integer NOT NULL,
	`consecutive_missed_after_66` integer NOT NULL,
	`reconciled_through_date` text NOT NULL,
	`recalculated_at` text NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `schema_migrations` (
	`version` integer PRIMARY KEY NOT NULL,
	`applied_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `task` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`category_id` text,
	`date` text,
	`time_of_day` text,
	`description` text,
	`is_completed` integer NOT NULL,
	`completed_at` text,
	`sort_order` real NOT NULL,
	`color_variant_seed` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE no action
);
