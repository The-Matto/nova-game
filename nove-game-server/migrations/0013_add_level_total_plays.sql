-- Durable, unlike WeeklyPlays.ts's Redis-only weekly counter - "all time" has no natural expiry,
-- so Postgres (already the source of truth for everything else about a level) is the right home
-- for it rather than a Redis key that would just accumulate forever.
ALTER TABLE levels ADD COLUMN total_plays BIGINT NOT NULL DEFAULT 0;
