CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`player1_id` text NOT NULL,
	`player2_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`player1_score` integer DEFAULT 0 NOT NULL,
	`player2_score` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`player1_choice` text,
	`player2_choice` text,
	`winner` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
