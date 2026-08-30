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
- **Leaderboards**: planned, backed by Redis (fast read/write for ranking, e.g. sorted sets for
  per-level best times) and a PostgreSQL server (durable storage — levels, users, run history).
  Neither is wired up yet.

## Deployment (planned)

- Backend (`nove-game-server`) will be hosted on **Railway**, alongside its Redis and PostgreSQL
  instances.
- No deployment for the client has been decided yet.

## Current state (as of Aug 2026)

Already working / in progress:
- Basic player movement (`NVPlayerPhysics.ts`, `PlayerController.ts`, `PlayerCharacter.ts`).
- A test free-fly camera mode for the level editor.
- React UI layer with buttons overlaid on the Three.js canvas (`Components/Game/UserInterface`,
  `ReactInputHandler.tsx`).
- Level loading from JSON (`SceneBuilder.ts`, `NVScene.ts`).
- A basic DOM interop layer for in-game UI (`ui-DOM-interop.ts`) and a virtual cursor.
- Test `TransformControls` for editor gizmo work.

Not yet built (expected next):
- Target placement + shooting/combat and hit detection.
- Timer/level-completion logic and scoring.
- Level upload/download flow to the server, and a level browser.
- Full level editor UX beyond the current free-fly test.

## Running it

- Front end: `cd nova-game-client && npm run dev` (plain Vite dev server). The dev server proxies
  `/game` to `ws://localhost:8080/`, so the backend is expected to be running locally on port 8080
  alongside it for networked features to work.
- Backend: `cd nove-game-server && npm start` (runs `tsx src/server.ts`).

See [TODO.md](TODO.md) for the current task list.

## Working conventions

- Everything is TypeScript on both ends.
- The client follows a **Unreal Engine–style architecture** on top of Three.js: Actors and
  Components rather than a third-party ECS (`Three/Actor.ts`, `Three/Components/NVComponent.ts`,
  `Interfaces/TickableInterface.ts`), naming/patterns lean UE-ish elsewhere too (e.g.
  `PlayerController.ts`, `PlayerCharacter.ts`, `Replication.ts`). Follow this Actor/Component/
  Controller style for new gameplay code rather than introducing a different framework or an ECS.
- Keep an eye on `// TODO` comments scattered in recently touched files — they're the live task
  list until this doc says otherwise.
- Keep comments light — this has been flagged repeatedly, so treat it as a hard cap, not a
  suggestion: most comments should be 1 line, 2 only when genuinely needed, and most
  methods/fields need zero. 3 lines is over the top for the vast majority of cases — treat
  hitting it as a sign to cut the comment down, not a sign to keep writing. A comment earns its
  place only for a genuinely non-obvious *why*; don't add one to every new method/field, and
  don't restate what the code already says.
- Use `DragNumberInput` (`Components/UI/DragNumberInput.tsx`) for every numeric input in the
  editor UI, instead of a native `<input type="number">` — click to type a value, drag left/right
  to scrub it, no spinner buttons. `Vector3Input` (`Components/UI/Vector3Input.tsx`) builds an
  X/Y/Z triple of these on top, with the standard red/green/blue axis colors.
- Every `@EditableProperty` field must round-trip through the level JSON: saved into
  `properties` on export/serialize and applied back on load/respawn. This is automatic —
  `NVActor.ToSpawnDescriptor()` and `ApplyEditableProperties()` (called from
  `NVScene.SpawnActor()`) handle any field decorated with `@EditableProperty`, so a new property
  needs no extra wiring — but always verify a new one actually survives a save → load cycle
  (Export then Import, or a PIE restart), especially if the actor's own constructor also reads
  `descripter.properties` directly for something else.
- Any actor with a timer/counter/cycle that drives its own gameplay behavior (a cooldown before
  firing, a hazard's on/off cycle, a projectile's flight) must reset that state on
  `OnPlayerRespawned()`. Retrying (death, voluntary pause, or falling to KILL_Y) calls this on
  every actor via `NVPlayerPhysics.RespawnAtSpawnPoint()`, and a run should be deterministic: the
  same hazard state at the same point every attempt, not whatever it drifted to before the last
  death. See `NVCannonActor`, `NVSpikeActor`, `NVLaserProjectile` for the pattern — purely
  cosmetic state (e.g. a weapon's view-model recoil) doesn't need this.
- The same actors must also check `IsGameplayFrozen()` (`Utility/PlayerGlobals.ts`) in `Tick()`,
  alongside the existing `EditorState.isInEditor` check, and skip their own timer/cycle/movement
  entirely while it's true — otherwise a hazard keeps firing/animating/damaging right through the
  pause or death menu, or during the pre-run countdown. `EditorState.isInEditor` alone only
  covers the editor; `IsGameplayFrozen()` covers dead/paused/counting-down.
