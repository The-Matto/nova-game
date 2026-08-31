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

## Deployment (planned)

- Backend (`nove-game-server`) will be hosted on **Railway**, alongside its Redis and PostgreSQL
  instances.
- No deployment for the client has been decided yet.

## Current state (as of Aug 2026)

Already working / in progress:
- Basic player movement (`NVPlayerPhysics.ts`, `PlayerController.ts`, `PlayerCharacter.ts`).
- A free-fly editor mode with gizmo-based placement/transform, multi-select, and Play-In-Editor.
- React UI layer overlaid on the Three.js canvas (`Components/Game/UserInterface`), including a
  full gameplay loop: pre-run countdown, target placement/shooting/hit detection, a level timer,
  and a Level Complete screen.
- A REST-backed level browser (`GET /api/levels`) and leaderboard (`GET`/`POST /api/leaderboard`)
  both querying a real PostgreSQL database (see "Running it" below) — levels, players, and
  leaderboard runs are all real rows.
- Anonymous-but-real player identity: `POST /api/players` mints a real database row and UUID per
  browser, no login yet — see `PlayerIdentity.ts` (client) and `PlayersApi.ts` (server).

Not yet built (expected next):
- Actual level upload (editor → server): the level browser correctly lists whatever's in the
  `levels` table, but there's still no path from "Export in the editor" to a new row appearing
  there — rows only get in via a direct DB insert today, not a real upload flow.
- Redis, for fast leaderboard reads in front of Postgres (Postgres alone is the whole leaderboard
  right now, which is fine at this scale).
- Real accounts (OAuth) — see the anonymous-identity point above; this is the planned upgrade.
- Full level editor UX beyond the current feature set (e.g. undo/redo, better palette browsing).

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
4. Create `nove-game-server/.env` (gitignored, never commit it) containing exactly one line:
   `DATABASE_URL=<that connection string>`.
5. Apply the schema: `cd nove-game-server && npm run migrate`.

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
