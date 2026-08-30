import {NVPawn} from "../Pawn.ts";
import {RegisterClass} from "../ClassDescripter.ts";
import {ReplicatedActor, ReplicatedVariable} from "../Replication.ts";
import {NVScene} from "../NVScene.ts";
import {NVWeapon} from "./Weapon.ts";
import * as THREE from "three";
import {GameEvents} from "../Utility/GameEvents.ts";
import {StartCountdown} from "../Utility/Countdown.ts";

//The real gameplay pawn: gravity, collision, jumping. Spawned fresh each PIE start at the
//level's NVPlayerSpawn marker - never placed directly in level JSON.
@RegisterClass("NVPlayerCharacter") @ReplicatedActor(12)
export class NVPlayerCharacter extends NVPawn {

    private weapon : NVWeapon | null = null;

    //Spawns the weapon and attaches it to the camera (this.scene, shared - see NVPawn), so it
    //fires from wherever the player is looking.
    BeginPlay() {
        super.BeginPlay();

        this.weapon = NVScene.SpawnActor({
            class: "NVWeapon",
            location: new THREE.Vector3(),
            scale: new THREE.Vector3(1, 1, 1),
        }) as NVWeapon;
        this.scene.add(this.weapon.scene);
    }

    BeginDestroy() {
        super.BeginDestroy();

        if (this.weapon) {
            NVScene.DestroyActor(this.weapon);
            this.weapon = null;
        }
    }

    public Fire() {
        this.weapon?.Fire();
    }

    Jump() {
        this.playerPhysics.TryJump(5);
    }

    //Every death routes through here (see NVPawn.PlayerDeath). Freezes physics rather than
    //respawning immediately, so the world stays exactly as it was until the player clicks Retry
    //on the game menu (see PlayerRetry) - Return to Editor/Menu never need it reset at all.
    public PlayerDeath() {
        this.playerPhysics.isDead = true;
        this.playerPhysics.playerVelocity.set(0, 0, 0);
        GameEvents.Emit('gameMenuOpened', {reason: 'died'});
    }

    //Called by the game menu's "Retry" button - the deferred reset PlayerDeath held off on, or
    //just a "restart from spawn" if reached via a voluntary Pause instead.
    public PlayerRetry() {
        this.playerPhysics.isDead = false;
        this.playerPhysics.isPaused = false;
        this.playerPhysics.isLevelComplete = false;
        this.playerPhysics.RespawnAtSpawnPoint();
        StartCountdown();
    }

    //Reaching the goal volume (see NVGoalVolume.OnPlayerEnter) - freezes physics like PlayerDeath,
    //so the player can't keep moving/falling behind the Level Complete screen.
    public LevelComplete() {
        this.playerPhysics.isLevelComplete = true;
        this.playerPhysics.playerVelocity.set(0, 0, 0);
    }

    //'P' during gameplay (see PlayerController.ToggleEditorMode) - opens the same menu as
    //PlayerDeath, without actually dying.
    public Pause() {
        this.playerPhysics.isPaused = true;
        GameEvents.Emit('gameMenuOpened', {reason: 'paused'});
    }

    //Closes the menu without resetting anything - 'P' again, only reachable from a voluntary
    //pause (never while actually dead).
    public Resume() {
        this.playerPhysics.isPaused = false;
        GameEvents.Emit('gameResumed', undefined);
    }

    @ReplicatedVariable
    playerRepTest : boolean = false;
}
