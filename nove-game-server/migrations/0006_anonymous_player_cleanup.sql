-- Anonymous players get wiped after a grace period (see CleanupAnonymousUsers.ts) - NULL means
-- still anonymous, set once real OAuth linking exists (see 0001's own comment on that plan).
ALTER TABLE users ADD COLUMN claimed_at TIMESTAMPTZ;

-- A wiped player's leaderboard history should go with them.
ALTER TABLE leaderboard_entries DROP CONSTRAINT leaderboard_entries_player_id_fkey;
ALTER TABLE leaderboard_entries ADD CONSTRAINT leaderboard_entries_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES users (id) ON DELETE CASCADE;

-- A wiped player's uploaded levels should survive instead - just lose their attributed author.
ALTER TABLE levels ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE levels DROP CONSTRAINT levels_author_id_fkey;
ALTER TABLE levels ADD CONSTRAINT levels_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE SET NULL;
