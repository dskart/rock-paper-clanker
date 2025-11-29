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
ALTER TABLE `rounds` DROP COLUMN `player1_choice`;--> statement-breakpoint
ALTER TABLE `rounds` DROP COLUMN `player2_choice`;
