CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`player1_id` text NOT NULL,
	`player2_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `round_choices` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`player_id` text NOT NULL,
	`choice` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `round_choices_round_player_idx` ON `round_choices` (`round_id`,`player_id`);--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`winner_id` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
