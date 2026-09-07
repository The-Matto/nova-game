# Nova Game — Server

Backend-specific conventions. See the [repo-root CLAUDE.md](../CLAUDE.md) for the overall
project, repo layout, vision, and conventions that apply everywhere (comment-length rule
included). Package folder name is `nove-game-server` (typo intentional/existing — see root doc).

## Current architecture

- Plain Node `http.Server` (`server.ts`), no framework (no Express) — created once and shared by
  both the WebSocket server (`ws`, via `Sockets.ts`'s `CreateSocketListener`) and a hand-rolled
  REST layer, so both speak on the same port (8080).
- REST routing has no router/framework either: `server.ts`'s request handler tries each
  `Handle*Request(req, res)` function in turn (e.g. `LevelsApi.ts`'s `HandleLevelsRequest`,
  `LeaderboardApi.ts`'s `HandleLeaderboardRequest`), each returning `true`/`false` (or a Promise
  of one, `await`ed) for whether it handled the request, falling through to a 404 if none did.
  Follow this pattern for a new REST resource: a new `XApi.ts` exporting `HandleXRequest`, wired
  into `server.ts`'s chain.
- Postgres is wired up (`pg`, raw SQL, no ORM by choice) via `Db.ts`'s connection pool, reading
  `DATABASE_URL` from the environment (see "Local development database" below). `LevelsApi.ts`,
  `PlayersApi.ts`, and `LeaderboardApi.ts` all query real tables.
- Redis (`Redis.ts`, lazily built on first use like R2 - see below) backs two things: a sorted
  set per level caching the leaderboard ranking (`LeaderboardApi.ts`, falls back to/warms from a
  full Postgres scan on a miss), and a fixed-window per-IP rate limit on every POST endpoint
  (`RateLimit.ts`, `INCR`+`EXPIRE`, fails open if Redis is down). Neither breaks if `REDIS_URL`
  isn't set - see "Local development database" below.
- Level files (JSON + thumbnail) live in Cloudflare R2, not Postgres - `levels.path`/
  `thumbnail_url` just store the resulting public URLs (`R2.ts`'s `UploadToR2`). Keyed by level
  id, not author id: `levels/<id>/level.json` and `levels/<id>/thumbnail.(jpg|png)` - the id is
  already the one key everything else (leaderboard FKs, the client's selected-level state) joins
  on, so storage shouldn't need a second key (the author) just to find a level's files. The
  bucket is public-read (so the client's plain `fetch(path)` needs no auth/proxy - see
  `SceneBuilder.ts`), write-only via the server's R2 credentials, never the client's.
- No migration framework - `migrations/*.sql` are plain numbered SQL files, applied in order by
  `Migrate.ts` (`npm run migrate`), which tracks what's already run in a `_migrations` table.
  Add a new migration by creating the next-numbered `.sql` file; never edit one that's already
  been applied anywhere real.
- Request/response body shapes shared with the client live in `shared/src/*.ts` (e.g.
  `level-listing.ts`'s `LevelSummary`, `leaderboard.ts`'s `LeaderboardEntry`/
  `LeaderboardResponse`/`SubmitTimeRequest`, `player.ts`'s `PlayerIdentityDto`), imported as
  `nova-shared/<file>` from both ends — keep request/response types there, not duplicated inline.
- Anonymous-but-real identity: `POST /api/players` mints a real `users` row and returns its
  UUID. No login/password/OAuth yet (see root CLAUDE.md), but every player is a real row with a
  real id — the client's `PlayerIdentity.ts`/`EnsureRegistered()` just calls this once per
  browser and remembers the id in localStorage. Downstream tables (`leaderboard_entries`, and
  `levels.author_id`) use that id as a real foreign key, not a trusted display-name string.
- An account with `claimed_at` still null (i.e. still anonymous) gets deleted after 7 days by
  `CleanupAnonymousUsers.ts` (`npm run cleanup-anonymous-users`, run daily by the separate
  `nova-cleanup-cron` Railway service - same repo/Postgres, no HTTP server of its own).
  `leaderboard_entries` cascades on delete; `levels.author_id` sets to null instead so an
  uploaded level outlives its author (`LevelsApi.ts`'s `GET` handles a null author as "Unknown").
  Seed/reference users (`migrations/0004`/`0005`) are pre-marked claimed so they're exempt.

## Local development database/cache

There's no local Postgres/Redis (this machine has no Docker/WSL, and Railway is already the
target host either way — see root CLAUDE.md's Deployment section) — local dev connects to the
same Railway-hosted instances the app runs against in production, over an SSH tunnel rather than
exposing them publicly:

```
railway connect postgres --tunnel-only -P 5433
railway connect redis --tunnel-only -P 6380
```

Each holds a local tunnel open (`127.0.0.1:5433`/`127.0.0.1:6380`) and prints a ready-to-use
connection string the first time it starts — put those in `nove-game-server/.env` (gitignored)
as `DATABASE_URL`/`REDIS_URL`. Postgres's tunnel must stay running for anything that touches the
database (`npm run migrate`, `npm start`) to work - it's not a one-time setup step. Redis's is
optional - `Redis.ts` degrades gracefully without it (see above), so only bother if you actually
need to exercise leaderboard caching or rate limiting locally.
Requires `railway login` + `railway link` once, and a registered SSH key
(`railway ssh keys add`) if the CLI complains about one missing.
