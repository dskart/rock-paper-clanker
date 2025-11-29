-- Drop old score columns from matches table
ALTER TABLE `matches` DROP COLUMN `player1_score`;--> statement-breakpoint
ALTER TABLE `matches` DROP COLUMN `player2_score`;--> statement-breakpoint

-- Add new winnerId column to rounds table
ALTER TABLE `rounds` ADD COLUMN `winner_id` text;--> statement-breakpoint

-- Migrate existing winner data: "player1" -> player1Id, "player2" -> player2Id, "tie" -> NULL
-- This requires a data migration script that should be run separately
-- UPDATE rounds SET winner_id = (
--   SELECT CASE
--     WHEN rounds.winner = 'player1' THEN matches.player1_id
--     WHEN rounds.winner = 'player2' THEN matches.player2_id
--     ELSE NULL
--   END
--   FROM matches WHERE matches.id = rounds.match_id
-- );

-- Drop old winner column
ALTER TABLE `rounds` DROP COLUMN `winner`;
