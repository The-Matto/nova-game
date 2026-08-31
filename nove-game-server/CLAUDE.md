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
  `DATABASE_URL` from the environment (see "Local development database" below). `LevelsApi.ts`
  still returns a hardcoded array (level upload/storage isn't built yet), but `PlayersApi.ts` and
  `LeaderboardApi.ts` both query real tables. Redis isn't wired up yet.
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

## Local development database

There's no local Postgres/Redis (this machine has no Docker/WSL, and Railway is already the
target host either way — see root CLAUDE.md's Deployment section) — local dev connects to the
same Railway-hosted Postgres instance the app will eventually run against in production, over an
SSH tunnel rather than exposing it publicly:

```
railway connect postgres --tunnel-only -P 5433
```

This holds a local tunnel open on `127.0.0.1:5433` and prints a ready-to-use connection string
the first time it starts — put that in `nove-game-server/.env` (gitignored) as `DATABASE_URL`.
The tunnel must stay running in its own terminal/process for anything that touches the database
(`npm run migrate`, `npm start`) to work - it's not a one-time setup step.
Requires `railway login` + `railway link` once, and a registered SSH key
(`railway ssh keys add`) if the CLI complains about one missing.
