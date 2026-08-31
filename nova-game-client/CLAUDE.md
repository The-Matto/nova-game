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
- No real accounts yet: `Three/Utility/PlayerIdentity.ts` generates a stable per-browser display
  name (localStorage-persisted) used to identify the player to the backend (leaderboard
  submissions, etc.) — not a real player ID. See the server CLAUDE.md's note on the same thing.
