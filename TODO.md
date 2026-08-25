# Nova Game — TODO

High-level task list. See [CLAUDE.md](CLAUDE.md) for the project brief and architecture.

## Core gameplay

- [ ] Target actors: placeable in the level editor, shootable, register a hit.
- [ ] Shooting/combat: raycast or projectile hit detection from the player camera.
- [ ] Level timer: start on level begin, stop when all targets are cleared / level goal is met.
- [ ] Level completion + scoring flow (best time, maybe splits).

## Level editor

- [ ] Move free-fly + `TransformControls` test code into a real editor mode (place/move/rotate/
      scale actors, including targets).
- [ ] Level save: serialize editor state to the level JSON format.
- [ ] Level upload: send serialized level JSON to the backend.
- [ ] Level browser UI: list/search levels stored on the backend, load one into the player.

## Backend

- [ ] Level storage API (save/list/fetch level JSON) — persisted in PostgreSQL.
- [ ] Leaderboard service backed by Redis (e.g. sorted set per level: player → best time).
- [ ] PostgreSQL schema: users, levels, run/attempt history.
- [ ] Auth (even minimal) so leaderboard entries and uploaded levels are attributable to a player.

## Infra / deployment

- [ ] Provision Redis + PostgreSQL on Railway.
- [ ] Deploy `nove-game-server` to Railway.
- [ ] Decide + set up client hosting/deployment.

## Notes

- Keep an eye on `// TODO` comments in the code itself — those are finer-grained than this file.
- Update this file as items are finished or new ones are identified; it's meant to stay current,
  not to be a historical log.
