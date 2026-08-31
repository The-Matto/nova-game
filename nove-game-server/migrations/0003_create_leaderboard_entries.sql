-- Every submitted run, durable (see CLAUDE.md's Vision - run history).
CREATE TABLE leaderboard_entries (
    id BIGSERIAL PRIMARY KEY,
    level_id TEXT NOT NULL REFERENCES levels (id),
    player_id UUID NOT NULL REFERENCES users (id),
    time_seconds DOUBLE PRECISION NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ranking a level's leaderboard filters by level_id then sorts by time - covers both.
CREATE INDEX leaderboard_entries_level_time_idx ON leaderboard_entries (level_id, time_seconds);
