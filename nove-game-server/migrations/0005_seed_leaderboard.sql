-- Demo data so the leaderboard panel has something real to show before anyone's actually
-- played - same names/times the old in-memory dummy data used. Fixed ids + ON CONFLICT make
-- this safe to re-run.
INSERT INTO users (id, display_name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Nova'),
    ('00000000-0000-0000-0000-000000000002', 'Seum_Fan'),
    ('00000000-0000-0000-0000-000000000003', 'SpeedyG'),
    ('00000000-0000-0000-0000-000000000004', 'Grapple_King'),
    ('00000000-0000-0000-0000-000000000005', 'Wallhopper')
ON CONFLICT (id) DO NOTHING;

INSERT INTO leaderboard_entries (level_id, player_id, time_seconds, submitted_at) VALUES
    ('test-world', '00000000-0000-0000-0000-000000000001', 42.31, '2026-08-20T10:00:00.000Z'),
    ('test-world', '00000000-0000-0000-0000-000000000002', 38.77, '2026-08-22T14:00:00.000Z'),
    ('test-world', '00000000-0000-0000-0000-000000000003', 51.02, '2026-08-25T09:00:00.000Z'),
    ('test-world', '00000000-0000-0000-0000-000000000004', 33.90, '2026-08-26T09:00:00.000Z'),
    ('test-world', '00000000-0000-0000-0000-000000000005', 46.18, '2026-08-27T09:00:00.000Z');
