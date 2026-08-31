-- A level's metadata + (eventually) its data. Two delivery paths, both nullable so either can
-- be used: `path` for a level still served as a static file from the client's public/ folder
-- (like the seeded "Test World" - see LevelSummary.path), `level_data` for a real uploaded
-- level's full JSON once upload actually exists (not built yet - see CLAUDE.md/TODO.md). `id`
-- is plain text rather than UUID so today's human-readable slugs (e.g. "test-world") and future
-- generated ids can share the same column without a type migration later.
CREATE TABLE levels (
    id TEXT PRIMARY KEY,
    author_id UUID NOT NULL REFERENCES users (id),
    name TEXT NOT NULL,
    level_data JSONB,
    path TEXT,
    thumbnail_url TEXT,
    -- No rating-submission feature exists yet either - this just matches LevelSummary.rating's
    -- existing (non-optional) shape so the API doesn't need a schema change once one does.
    rating REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
