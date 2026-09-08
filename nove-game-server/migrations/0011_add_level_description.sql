-- Freeform, optional (empty by default) - unlike name/tags there's nothing to validate beyond a
-- length cap, enforced at the API layer (see LevelsApi.ts's MAX_DESCRIPTION_LENGTH).
ALTER TABLE levels ADD COLUMN description TEXT NOT NULL DEFAULT '';
