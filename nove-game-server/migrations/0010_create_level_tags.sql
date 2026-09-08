-- One row per (level, tag). The allowed tag values (LEVEL_TAGS in shared/src/level-tags.ts) are
-- validated at the API layer, not here - that list can grow later without a migration.
CREATE TABLE level_tags (
    level_id TEXT NOT NULL REFERENCES levels (id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (level_id, tag)
);

CREATE INDEX level_tags_tag_idx ON level_tags (tag);
