# Nova Game — TODO

High-level task list. See [CLAUDE.md](CLAUDE.md) for the project brief and architecture.

## Core gameplay

- [x] Target actors: placeable in the level editor, shootable, register a hit.
- [x] Shooting/combat: raycast or projectile hit detection from the player camera.
- [x] Level timer: start on level begin, stop when all targets are cleared / level goal is met.
- [x] Level completion + scoring flow (Level Complete screen, leaderboard submission).

## Level editor

- [x] Move free-fly + `TransformControls` test code into a real editor mode (place/move/rotate/
      scale actors, including targets, multi-select).
- [x] Level save: serialize editor state to the level JSON format (Export/Import).
- [x] Level upload: an Upload button sends the level JSON + a captured screenshot thumbnail to
      the backend, which stores both in Cloudflare R2 and creates the `levels` row.
- [x] Level browser UI: list levels from the backend, load one into the player, with search-by-
      name and pagination (both client-side for now - see the Backend item below).
- [ ] Undo/redo in the editor.

## Backend

- [x] PostgreSQL schema: `users`, `levels`, `leaderboard_entries` (run/attempt history) — see
      `nove-game-server/migrations/`.
- [x] Auth (even minimal): `POST /api/players` mints a real `users` row; leaderboard entries and
      `levels.author_id` reference it as a real foreign key, not a trusted display-name string.
      Still anonymous (no login) - see root CLAUDE.md's Vision for the planned OAuth follow-up.
- [x] Leaderboard durability: `GET`/`POST /api/leaderboard` query real Postgres now (ranked,
      deduped per-player).
- [x] Level list/fetch API — `GET /api/levels` queries the real `levels` table.
- [ ] `GET /api/levels` gains real `?search=&page=&tags=` params, with search/pagination/tag
      filtering moved server-side (Postgres `ILIKE`/`LIMIT`/`OFFSET`/a `level_tags` join) instead
      of the level browser fetching every level and doing all three client-side, which stops
      scaling once there are enough levels to matter.
- [x] Level save/upload API — `POST /api/levels` stores the level JSON + thumbnail in Cloudflare
      R2 (`R2.ts`, keyed by level id) and creates the `levels` row.
- [x] Leaderboard service backed by Redis — a sorted set per level caches the ranking in front of
      Postgres, falling back to (and warming from) a full Postgres scan on a miss. See
      `Redis.ts`/`LeaderboardApi.ts`.
- [x] Rate limiting on every POST endpoint (`RateLimit.ts`) — fixed-window per-IP counters via
      Redis, fails open if Redis is down. Coarse by design (shared IPs behind NAT share a bucket);
      revisit as (IP, playerId) if that becomes a real problem.
- [x] Anonymous account cleanup — accounts that never link a real login (`users.claimed_at` still
      null) get deleted after 7 days (`CleanupAnonymousUsers.ts`), cascading their leaderboard
      entries and nulling out `levels.author_id` instead of deleting their uploaded levels too.
- [x] Real accounts — GitHub OAuth (`AuthApi.ts`, session cookie backed by Redis). Links to the
      existing anonymous `users.id` rather than replacing it, so history carries over; leaderboard
      submission and level upload both prefer the session's own id over a client-supplied one when
      logged in, closing the impersonation gap that existed with anonymous-only identity.

## Security / hardening

- [x] Leaderboard submissions reject non-positive `timeSeconds` (was letting anyone fake #1).
- [x] Request bodies are capped before being buffered into memory (`Http.ts`), independent of any
      endpoint-specific size check.
- [x] `displayName` length is capped on registration, matching `LevelsApi.ts`'s own name cap.
- [x] `ws`/`nanoid`/`postcss`/`vite` bumped to patch known vulnerabilities (`npm audit fix`).
- [x] Documented (not changed) why Postgres's `rejectUnauthorized: false` is an accepted tradeoff
      - see `Db.ts`'s comment.
- [ ] `esbuild`'s remaining low-severity dev-server vulnerability - needs a breaking version bump,
      left alone since it's dev-only and low severity. Revisit if `npm audit fix --force` is ever
      worth it.

## Infra / deployment

- [x] Provision PostgreSQL and Redis on Railway, both wired into the code (see Backend above).
- [x] Client deployed: Cloudflare Pages, auto-deploys from GitHub on push to `master`.
- [x] `nove-game-server` deployed to Railway, confirmed live end-to-end (R2 env vars set, real
      traffic verified through both the direct Railway URL and the live site).
- [x] `functions/api/[[path]].ts` (repo root, a Cloudflare Pages Function) proxies `/api/*`
      from the client's own domain to the Railway server - same-origin from the browser's
      perspective, no CORS/base-URL-env-var needed. Needs updating if the Railway URL/domain
      ever changes (it's hardcoded, not derived).
- [x] `nova-cleanup-cron` — a separate Railway service (same repo/Postgres) running
      `CleanupAnonymousUsers.ts` on a daily cron schedule.
- [ ] Migrate `railway.json` (Config as Code) to `.railway/railway.ts` (Infrastructure as Code) -
      Railway's deprecated the former, "existing files keep working" only until 2026-12-01.
      Previously blocked by local Node being too old for that tooling's `--experimental-strip-types`
      requirement - needs a newer local Node before retrying.

## Notes

- Keep an eye on `// TODO` comments in the code itself — those are finer-grained than this file.
- Update this file as items are finished or new ones are identified; it's meant to stay current,
  not to be a historical log.
