-- Deleting a level (see LevelsApi.ts's DELETE handler) should take its leaderboard history with
-- it - those runs are meaningless once the level itself is gone, and the FK would otherwise just
-- block the delete outright.
ALTER TABLE leaderboard_entries DROP CONSTRAINT leaderboard_entries_level_id_fkey;
ALTER TABLE leaderboard_entries ADD CONSTRAINT leaderboard_entries_level_id_fkey
    FOREIGN KEY (level_id) REFERENCES levels (id) ON DELETE CASCADE;
