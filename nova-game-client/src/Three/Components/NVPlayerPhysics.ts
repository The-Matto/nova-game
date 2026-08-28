import {NVComponent} from "./NVComponent.ts";
import {Capsule} from "three/examples/jsm/math/Capsule";
import * as THREE from "three";
import {NVScene} from "../NVScene.ts";
import type {Vector3} from "three";


export class NVPlayerPhysics extends NVComponent {

    GRAVITY : number = 12;
    playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
    playerOnFloor: boolean = false;
    playerVelocity = new THREE.Vector3();

    //Where the player respawns after KILL_Z - taken from the collider's actual start position.
    private spawnPoint = this.playerCollider.end.clone();

    //UE-style "Kill Z" - fall below this and respawn instead of falling forever.
    //TODO Make level-configurable once world settings exist in the level JSON.
    private static readonly KILL_Z : number = -50;

    isSprinting : boolean = false;
    private sprintSpeed : number = 15;
    private walkSpeed : number = 10;

    isFreeFlying : boolean = false;
    private flySpeed : number = 15;

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
        this.updatePlayer(delta);
    }

    public SetWishDirection(direction : Vector3){
        this.wishDirection.copy(direction);
    }

    //Moves the collider and the KILL_Z respawn point - NVPawn.Init calls this once on spawn.
    public SetSpawnLocation(location : THREE.Vector3){
        const segment = this.playerCollider.end.clone().sub(this.playerCollider.start);
        this.playerCollider.end.copy(location);
        this.playerCollider.start.copy(location).sub(segment);
        this.spawnPoint.copy(location);
    }

    //Applies a jump impulse once per ground contact - see hasJumpedSinceGrounded.
    public TryJump(impulse : number) : boolean {
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

        //Free-flying (editor mode) skips collision and KILL_Z entirely.
        if (!this.isFreeFlying) {
            this.playerCollisions();
            this.checkKillZ();
        } else {
            this.playerOnFloor = false;
        }

        //owningActor.scene is the shared camera - see NVPawn.
        this.owningActor.scene.position.copy( this.playerCollider.end );

    }

    private checkKillZ() {
        if (this.playerCollider.end.y >= NVPlayerPhysics.KILL_Z) return;
        this.RespawnAtSpawnPoint();
    }

    //Teleports to spawn and zeroes velocity - shared by KILL_Z and hazards. Also lets every actor
    //react via NVActor.OnPlayerRespawned.
    public RespawnAtSpawnPoint() {
        const offset = this.spawnPoint.clone().sub(this.playerCollider.end);
        this.playerCollider.translate(offset);
        this.playerVelocity.set(0, 0, 0);

        for (const actor of NVScene.GetSceneActors()) actor.OnPlayerRespawned();
    }

    private applyMovementInput(deltaTime : number) {

        if (this.wishDirection.lengthSq() === 0) return;

        const moveSpeed : number = this.isFreeFlying
            ? this.flySpeed
            : (this.isSprinting ? this.sprintSpeed : this.walkSpeed);

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
