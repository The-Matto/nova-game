-- Same "Test World" entry LevelsApi.ts used to hardcode, now attributed to a real (seeded)
-- author row instead of a bare "Nova Team" string. Fixed ids + ON CONFLICT make this safe to
-- re-run.
INSERT INTO users (id, display_name) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Nova Team')
ON CONFLICT (id) DO NOTHING;

INSERT INTO levels (id, author_id, name, path, thumbnail_url, rating, created_at) VALUES
    ('test-world', '00000000-0000-0000-0000-000000000000', 'Test World', '/TestWorld.json',
     '/thumbnails/test-world.png', 4.5, '2026-08-01T00:00:00.000Z')
ON CONFLICT (id) DO NOTHING;
