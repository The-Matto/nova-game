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
- [x] Level browser UI: list levels from the backend, load one into the player. Search still TODO.

## Backend

- [x] PostgreSQL schema: `users`, `levels`, `leaderboard_entries` (run/attempt history) — see
      `nove-game-server/migrations/`.
- [x] Auth (even minimal): `POST /api/players` mints a real `users` row; leaderboard entries and
      `levels.author_id` reference it as a real foreign key, not a trusted display-name string.
      Still anonymous (no login) - see root CLAUDE.md's Vision for the planned OAuth follow-up.
- [x] Leaderboard durability: `GET`/`POST /api/leaderboard` query real Postgres now (ranked,
      deduped per-player).
- [x] Level list/fetch API — `GET /api/levels` queries the real `levels` table.
- [x] Level save/upload API — `POST /api/levels` stores the level JSON + thumbnail in Cloudflare
      R2 (`R2.ts`, keyed by level id) and creates the `levels` row.
- [ ] Leaderboard service backed by Redis — still Postgres-only; Redis would sit in front for
      fast ranked reads, per the durable-Postgres/fast-Redis split in root CLAUDE.md's Vision.

## Infra / deployment

- [x] Provision PostgreSQL on Railway (Redis provisioned too, not wired into code yet).
- [ ] Deploy `nove-game-server` to Railway. Local dev currently connects to the same Railway
      Postgres instance over an SSH tunnel (`railway connect postgres --tunnel-only`) - see
      nove-game-server/CLAUDE.md. Once the server itself is deployed there, it should switch to
      Railway's private `DATABASE_URL` instead of the tunnel/public one.
- [ ] Decide + set up client hosting/deployment.

## Notes

- Keep an eye on `// TODO` comments in the code itself — those are finer-grained than this file.
- Update this file as items are finished or new ones are identified; it's meant to stay current,
  not to be a historical log.
