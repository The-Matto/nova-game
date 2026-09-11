-- A plausibility floor for leaderboard submissions (see LevelsApi.ts's ComputeMinPlausibleTime),
-- computed from spawn->goal distance at upload/update time. NULL (existing rows, or a level
-- missing either actor) means no floor is enforced - fails open, same as everywhere else.
ALTER TABLE levels ADD COLUMN min_time_seconds REAL;
