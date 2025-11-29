PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`player1_choice` text,
	`player2_choice` text,
	`winner` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_rounds`("id", "match_id", "round_number", "player1_choice", "player2_choice", "winner", "created_at", "completed_at") SELECT "id", "match_id", "round_number", "player1_choice", "player2_choice", "winner", "created_at", "completed_at" FROM `rounds`;--> statement-breakpoint
DROP TABLE `rounds`;--> statement-breakpoint
ALTER TABLE `__new_rounds` RENAME TO `rounds`;--> statement-breakpoint
PRAGMA foreign_keys=ON;