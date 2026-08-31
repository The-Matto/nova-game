-- Anonymous-for-now player identity (see CLAUDE.md's auth plan). Deliberately minimal: just
-- enough for a stable id + display name. OAuth linking will be a separate table keyed by
-- users.id later, not columns bolted on here, so anonymous players can link an OAuth identity
-- to their existing id/history without a breaking migration.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
