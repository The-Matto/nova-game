# Nova Game — Client

Client-specific conventions. See the [repo-root CLAUDE.md](../CLAUDE.md) for the overall project,
repo layout, vision, and conventions that apply everywhere (comment-length rule included).

## Working conventions

- The client follows a **Unreal Engine–style architecture** on top of Three.js: Actors and
  Components rather than a third-party ECS (`Three/Actor.ts`, `Three/Components/NVComponent.ts`,
  `Interfaces/TickableInterface.ts`), naming/patterns lean UE-ish elsewhere too (e.g.
  `PlayerController.ts`, `PlayerCharacter.ts`, `Replication.ts`). Follow this Actor/Component/
  Controller style for new gameplay code rather than introducing a different framework or an ECS.
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
  covers the editor; `IsGameplayFrozen()` covers dead/paused/counting-down/level-complete.
- No login yet, but `Three/Utility/PlayerIdentity.ts` isn't just a display-name string either:
  `EnsureRegistered()` mints a real server-side player id (`POST /api/players`) the first time a
  browser is seen and remembers it in localStorage — call it before anything that needs
  `PlayerIdentity.id` (submitting a run, uploading a level), since it may not have resolved yet.
  See the server CLAUDE.md's note on the same thing.
- `npm run build` is just `vite build` - it does **not** typecheck. `tsc -b` is a separate
  `npm run typecheck` script. They were combined (`tsc -b && vite build`) once, but the project's
  `composite`/reference setup was broken in a way that only surfaced when `tsc -b` actually ran
  for real (not `--noEmit`) - see the git history around when this was split, or just don't
  recombine them without first confirming `tsc -b` (no `--noEmit`) succeeds project-wide, since a
  handful of pre-existing type errors (missing `three/examples/jsm` subpath types, a couple of
  unused-import/variable warnings) are still there and were never actually fixed, only excluded
  from the build path.
- The deployed client (Cloudflare Pages) reaches the backend (Railway) through `public/_redirects`
  - it proxies `/api/*` to the Railway server's URL (status `200`, not a redirect, so Cloudflare
    Pages fetches server-side and the browser sees only its own domain - no CORS needed, and the
    client's `fetch('/api/...')` calls stay relative, no build-time base-URL env var needed). If
    the Railway URL/domain ever changes, this file's target needs updating to match - it's not
    derived from anything, just a hardcoded proxy target. WebSocket traffic (`/game`) isn't
    proxied by this and would need a different approach if that ever becomes load-bearing (it
    isn't yet - see root CLAUDE.md's Vision).
- `npm run dev`'s proxy (`vite.config.ts`) defaults to the local backend (`localhost:8080`), same
  as always. To point it at a remote backend instead (e.g. the deployed Railway server) without
  running that backend/its DB tunnel locally, set `VITE_DEV_API_TARGET` in a gitignored
  `nova-game-client/.env.local`, e.g. `VITE_DEV_API_TARGET=https://nova-server-production-70d5.up.railway.app`.
  Needs `changeOrigin: true` on the proxy to work against a real HTTPS host (without it, the
  proxy forwards the original `Host: localhost` header, which breaks TLS/SNI against anything
  that isn't plain local HTTP) - don't remove that if touching this config.
