-- Seed/reference users (0004, 0005) aren't real anonymous players - marking them already
-- "claimed" exempts them permanently from CleanupAnonymousUsers.ts's expiry.
UPDATE users SET claimed_at = now()
WHERE id IN (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005'
) AND claimed_at IS NULL;
