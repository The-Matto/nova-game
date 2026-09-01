# Nova Game

A web-based time-trial FPS built with TypeScript + Three.js on the front end, with a TypeScript
backend. Think **Seum**: players race through hand-built levels, shooting targets, aiming for the
fastest completion time. The game also ships a **level editor** so players can build levels and
upload them (serialized as JSON) for other players to load and play.

## Repo layout

npm workspaces, three packages:

- `nova-game-client/` — the game + level editor (Three.js, React UI layer, Vite). Note the
  package.json name is `fps-web-game`.
- `nove-game-server/` — **note the typo in the folder name** (missing the "a" in "nova"), this is
  intentional/existing, not a mistake to "fix" without asking. npm package name is `gameserver`.
  Runs on `ws` (WebSockets) via `tsx src/server.ts`.
- `shared/` — package name `nova-shared`, code shared between client and server (currently just
  `array-buffer-handler.ts`, likely for net serialization).

## Vision / end goal

- Core loop: load a level → run/traverse it as fast as possible → shoot all placed targets →
  finish → time is recorded.
- Levels are authored in-editor and serialize to JSON (see `nova-game-client/public/*.json` for
  example level data, e.g. `TestWorld.json`).
- Levels get uploaded to the backend so other players can browse/load/play community levels.
- Multiplayer/netcode groundwork exists (`WebSocketConnection.ts`, `client-net-driver.ts`,
  `Sockets.ts`, `Replication.ts`) — likely aiming for at least ghost/leaderboard-style
  competition, possibly live multiplayer.
- **Leaderboards**: durable storage (levels, users, run history) is PostgreSQL, wired up and live
  — see "Current state" below. Redis, for fast per-level ranked reads in front of it, isn't wired
  up yet.

## Deployment

- Client (`nova-game-client`): **Cloudflare Pages**, auto-deploys from GitHub on push to
  `master`. Build command `npm install && npm run build --workspace=nova-game-client`, output
  directory `nova-game-client/dist` (set as the Pages project's Root directory stays the repo
  root - see the monorepo note under "First-time setup" below, same reasoning applies).
- Backend (`nove-game-server`): **Railway**, alongside its Postgres (wired up) and Redis
  (provisioned, not wired up yet) instances - also auto-deploys from GitHub on push to `master`,
  config in the repo root's `railway.json`.
- The client reaches the backend via `nova-game-client/public/_redirects` proxying `/api/*` to
  the Railway server's URL - see `nova-game-client/CLAUDE.md` for how/why.

## Current state (as of Sep 2026)

Already working / in progress:
- Core gameplay loop: pre-run countdown → movement/shooting → targets → level timer → Level
  Complete, with hazards (spikes, a cannon firing laser projectiles, falling platforms, a door
  that opens after enough targets are shot), death (vignette + respawn/retry), and pause (also
  triggered automatically by losing window focus or pointer lock, not just the P key).
- Level editor: a free-fly pawn, a `TransformControls` gizmo (move/rotate/scale), multi-select
  with group transform and Alt-drag duplicate, a selection outline, a categorized palette panel,
  Export/Import (clipboard) plus a real Upload to the backend, and Play-In-Editor testing.
- Menus: Main Menu (Play/Editor/Options), an Options menu (mouse sensitivity, camera tilt), and
  pause/death/Level Complete overlays.
- A REST-backed level browser and leaderboard, both querying a real PostgreSQL database (see
  "Running it" below) — level rows, player identities, and leaderboard runs are all real data,
  not hardcoded/in-memory. The browser expands a level to show a bigger thumbnail, its top-5
  leaderboard (plus your own rank if you're outside it), and a Play button.
- Level upload: the editor's Upload button captures a screenshot as the thumbnail, POSTs the
  level JSON to the backend, which stores both in Cloudflare R2 (keyed by level id, not author -
  see `nove-game-server/CLAUDE.md`) and creates the `levels` row - no direct DB insert needed
  anymore to add a level.
- Anonymous-but-real player identity: `POST /api/players` mints a real database row and UUID per
  browser, no login yet — see `PlayerIdentity.ts` (client) and `PlayersApi.ts` (server).

Not yet built (expected next):
- Redis, for fast leaderboard reads in front of Postgres (Postgres alone is the whole leaderboard
  right now, which is fine at this scale).
- Real accounts (OAuth) — see the anonymous-identity point above; this is the planned upgrade.
- Anything built on the WebSocket/multiplayer groundwork mentioned above (ghost racing, live
  multiplayer) — the socket scaffold exists but nothing gameplay-facing runs on it yet.
- Further editor/browser UX (undo/redo, level browser search).

## Running it

### First-time setup

1. `npm install` from the repo root (npm workspaces — installs all three packages).
2. Install the [Railway CLI](https://railway.app/cli), then `railway login` and `railway link`
   (from the repo root) to connect it to the project that has the Postgres/Redis instances. See
   [nove-game-server/CLAUDE.md](nove-game-server/CLAUDE.md) for why local dev uses Railway's
   Postgres rather than a local one, and what to do if `railway connect` complains about a
   missing SSH key.
3. Open a tunnel to Postgres and leave it running in its own terminal:
   `railway connect postgres --tunnel-only -P 5433`. The first time it starts, it prints a
   connection string.
4. Create `nove-game-server/.env` (gitignored, never commit it) containing:
   `DATABASE_URL=<that connection string>`.
5. Apply the schema: `cd nove-game-server && npm run migrate`.
6. For level upload (Cloudflare R2 - see `nove-game-server/CLAUDE.md` for the storage layout):
   create an R2 bucket, enable public access on it (get the resulting public base URL), and
   create an R2 API token scoped to it (Object Read & Write) for an Access Key ID/Secret. Add
   five more lines to `nove-game-server/.env`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL_BASE`.

### Every time you work on it

- Keep the DB tunnel running: `railway connect postgres --tunnel-only -P 5433` (step 3 above) —
  `npm run migrate`/`npm start` in `nove-game-server` can't reach Postgres without it.
- Backend: `cd nove-game-server && npm start` (runs `tsx src/server.ts`).
- Front end: `cd nova-game-client && npm run dev` (plain Vite dev server). The dev server proxies
  `/game` (WebSocket) and `/api` (REST) to `localhost:8080`, so the backend needs to be running
  alongside it for anything networked to work.

See [TODO.md](TODO.md) for the current task list.

## Working conventions

- Everything is TypeScript on both ends.
- Keep an eye on `// TODO` comments scattered in recently touched files — they're the live task
  list until this doc says otherwise.
- Keep comments light — this has been flagged repeatedly, so treat it as a hard cap, not a
  suggestion: most comments should be 1 line, 2 only when genuinely needed, and most
  methods/fields need zero. 3 lines is over the top for the vast majority of cases — treat
  hitting it as a sign to cut the comment down, not a sign to keep writing. A comment earns its
  place only for a genuinely non-obvious *why*; don't add one to every new method/field, and
  don't restate what the code already says.

See [nova-game-client/CLAUDE.md](nova-game-client/CLAUDE.md) and
[nove-game-server/CLAUDE.md](nove-game-server/CLAUDE.md) for conventions specific to each side.
