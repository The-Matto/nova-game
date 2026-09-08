-- One rating per (level, player) - upserted, not accumulated, so re-rating updates their existing
-- score rather than skewing the average with duplicates. levels.rating (LevelSummary.rating)
-- stays the source of truth for display, recomputed as the average here on every write - not
-- read from this table live on every GET /api/levels.
CREATE TABLE level_ratings (
    level_id TEXT NOT NULL REFERENCES levels (id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    rated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (level_id, player_id)
);
