import {NVComponent} from "./NVComponent.ts";
import {Capsule} from "three/examples/jsm/math/Capsule";
import * as THREE from "three";
import {NVScene} from "../NVScene.ts";
import type {Vector3} from "three";
import type {NVPawn} from "../Pawn.ts";
import {MainCamera} from "../Camera.ts";


export class NVPlayerPhysics extends NVComponent {

    GRAVITY : number = 12;
    playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
    playerOnFloor: boolean = false;
    playerVelocity = new THREE.Vector3();

    //Where/which way the player respawns after falling below worldSettings.killY or a retry -
    //set via SetSpawnYaw, since the marker's rotation isn't part of the pawn's own
    //SpawnDescriptor (see PlayInEditor).
    private spawnPoint = this.playerCollider.end.clone();
    private spawnYaw : number = 0;

    private walkSpeed : number = 10;

    isFreeFlying : boolean = false;
    private flySpeed : number = 15;

    //True between PlayerDeath and PlayerRetry - freezes physics entirely so the world stays
    //exactly as it was at the moment of death until the player actually chooses to retry.
    isDead : boolean = false;
    //True while the pause menu (opened via 'P' - see PlayerController.ToggleEditorMode) is
    //showing - also freezes physics, cleared by Resume() rather than a full respawn.
    isPaused : boolean = false;
    //True during the pre-run countdown (see Utility/Countdown.ts) - also freezes physics, so
    //the player can't drift/fall before the run actually starts.
    isCountingDown : boolean = false;
    //True once the goal volume has been reached - also freezes physics, so the player can't
    //keep moving/falling behind the Level Complete screen.
    isLevelComplete : boolean = false;

    //Set while a temporary gravity powerup is active (see ApplyGravityOverride/NVPowerupPickup) -
    //reverts on its own once the timer runs out, or immediately on respawn.
    private baseGravity : number = this.GRAVITY;
    private gravityOverrideRemaining : number = 0;

    //Guards against one jump press applying multiple impulses.
    private hasJumpedSinceGrounded : boolean = false;

    //Coyote time - TryJump allows a jump within COYOTE_TIME of leaving the ground.
    private timeSinceGrounded : number = 0;
    private static readonly COYOTE_TIME : number = 0.3;

    //Normalized per-frame movement input, set by NVPlayerCharacter.
    private wishDirection = new THREE.Vector3();

    //Drag applied every frame, as a decay rate (units: 1/second).
    private readonly FRICTION : number = 4;

    //Equals FRICTION, so walkSpeed/sprintSpeed/flySpeed are the actual top speed reached.
    private readonly GROUND_ACCELERATION : number = 4;
    //Reduced air control - standard FPS feel.
    private readonly AIR_ACCELERATION : number = 1.5;

    TickComponent(delta : number){
        if (this.isDead || this.isPaused || this.isCountingDown || this.isLevelComplete) return;
        this.updatePlayer(delta);
    }

    public SetWishDirection(direction : Vector3){
        this.wishDirection.copy(direction);
    }

    //Called by NVPowerupPickup - overrides GRAVITY for `duration` seconds, then reverts on its
    //own (see TickComponent). A second pickup while one's already active just extends/replaces
    //it rather than stacking - baseGravity is only (re)captured when nothing's currently active,
    //so it can't get overwritten by the temporary value itself.
    public ApplyGravityOverride(value : number, duration : number) {
        if (this.gravityOverrideRemaining <= 0) this.baseGravity = this.GRAVITY;
        this.GRAVITY = value;
        this.gravityOverrideRemaining = duration;
    }

    private TickGravityOverride(deltaTime : number) {
        if (this.gravityOverrideRemaining <= 0) return;

        this.gravityOverrideRemaining -= deltaTime;
        if (this.gravityOverrideRemaining <= 0) this.GRAVITY = this.baseGravity;
    }

    //Moves the collider and the KILL_Y respawn point - NVPawn.Init calls this once on spawn.
    public SetSpawnLocation(location : THREE.Vector3){
        const segment = this.playerCollider.end.clone().sub(this.playerCollider.start);
        this.playerCollider.end.copy(location);
        this.playerCollider.start.copy(location).sub(segment);
        this.spawnPoint.copy(location);
    }

    //Called alongside MainCamera.SetYaw() on the initial spawn (see PlayInEditor.StartPlaying) -
    //remembered so RespawnAtSpawnPoint can face the player the same way on every retry too.
    public SetSpawnYaw(yawRadians : number){
        this.spawnYaw = yawRadians;
    }

    //Applies a jump impulse once per ground contact - see hasJumpedSinceGrounded. Unlike most
    //input this isn't gated by TickComponent's freeze (it's called directly from NVPawn.Jump),
    //so it needs its own guard - otherwise a held Space would queue an impulse that launches the
    //player the instant isDead/isPaused/isCountingDown/isLevelComplete clears.
    public TryJump(impulse : number) : boolean {
        if (this.isDead || this.isPaused || this.isCountingDown || this.isLevelComplete) return false;
        if (this.timeSinceGrounded > NVPlayerPhysics.COYOTE_TIME || this.hasJumpedSinceGrounded) return false;

        //Set, not added - clears residual fall velocity from the coyote window instead of just
        //partly cancelling it.
        this.playerVelocity.y = impulse;
        this.hasJumpedSinceGrounded = true;
        return true;
    }

    private updatePlayer( deltaTime : number ) {

        this.timeSinceGrounded += deltaTime;
        this.applyMovementInput(deltaTime);
        this.TickGravityOverride(deltaTime);

        if ( !this.playerOnFloor && !this.isFreeFlying) {
            this.playerVelocity.y -= this.GRAVITY * deltaTime;
        }

        //Friction only touches the horizontal plane so jumps/falls stay crisp; free-flying also
        //damps vertical since it has no gravity to arrest drift.
        const damping : number = Math.exp( -this.FRICTION * deltaTime ) - 1;
        this.playerVelocity.x += this.playerVelocity.x * damping;
        this.playerVelocity.z += this.playerVelocity.z * damping;
        if (this.isFreeFlying) {
            this.playerVelocity.y += this.playerVelocity.y * damping;
        }

        const deltaPosition = this.playerVelocity.clone().multiplyScalar( deltaTime );
        this.playerCollider.translate( deltaPosition );

        //Free-flying (editor mode) skips collision and KILL_Y entirely.
        if (!this.isFreeFlying) {
            this.playerCollisions();
            this.checkKillY();
        } else {
            this.playerOnFloor = false;
        }

        //owningActor.scene is the shared camera - see NVPawn.
        this.owningActor.scene.position.copy( this.playerCollider.end );

    }

    private checkKillY() {
        if (this.playerCollider.end.y >= NVScene.worldSettings.killY) return;
        (this.owningActor as NVPawn).PlayerDeath();
    }

    //Teleports to spawn and zeroes velocity, and lets every actor react via
    //NVActor.OnPlayerRespawned - only called from NVPlayerCharacter.PlayerRetry.
    public RespawnAtSpawnPoint() {
        const offset = this.spawnPoint.clone().sub(this.playerCollider.end);
        this.playerCollider.translate(offset);
        this.playerVelocity.set(0, 0, 0);

        //A powerup mid-effect shouldn't carry over into a fresh attempt.
        if (this.gravityOverrideRemaining > 0) {
            this.GRAVITY = this.baseGravity;
            this.gravityOverrideRemaining = 0;
        }

        //Normally synced from the collider at the end of updatePlayer() - but that's skipped
        //entirely while frozen (see TickComponent), which StartCountdown() does right after this
        //call, so without this the camera would keep showing the old (pre-respawn) position for
        //the whole countdown.
        this.owningActor.scene.position.copy(this.playerCollider.end);
        MainCamera.SetYaw(this.spawnYaw);

        for (const actor of NVScene.GetSceneActors()) actor.OnPlayerRespawned();
    }

    private applyMovementInput(deltaTime : number) {

        if (this.wishDirection.lengthSq() === 0) return;

        const moveSpeed : number = this.isFreeFlying ? this.flySpeed : this.walkSpeed;

        const accel : number = this.isFreeFlying || this.playerOnFloor
            ? this.GROUND_ACCELERATION
            : this.AIR_ACCELERATION;

        const speedDelta : number = moveSpeed * accel * deltaTime;

        if (this.isFreeFlying) {
            this.playerVelocity.addScaledVector(this.wishDirection, speedDelta);
        } else {
            //Vertical velocity is never touched here - owned by gravity, jumps, and collision.
            this.playerVelocity.x += this.wishDirection.x * speedDelta;
            this.playerVelocity.z += this.wishDirection.z * speedDelta;
        }
    }

    private playerCollisions() {

        //TODO Implement a spacial grid for collision checking instead of looping every mesh
        const result = NVScene.worldOctree.capsuleIntersect(this.playerCollider);
        this.playerOnFloor = false;

        if (result) {

            this.playerOnFloor = result.normal.y > 0;
            if (this.playerOnFloor) {
                this.timeSinceGrounded = 0;
                this.hasJumpedSinceGrounded = false;
            }

            //Cancels velocity into the surface on any contact - fixes inconsistent jump height
            //from stale fall speed carrying over into the next landing.
            this.playerVelocity.addScaledVector(result.normal, -result.normal.dot(this.playerVelocity));

            if (result.depth >= 1e-10)
                this.playerCollider.translate(result.normal.multiplyScalar(result.depth));

        }
    }
}
