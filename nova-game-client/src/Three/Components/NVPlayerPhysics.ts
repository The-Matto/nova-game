import {NVComponent} from "./NVComponent.ts";
import {Capsule} from "three/examples/jsm/math/Capsule";
import * as THREE from "three";
import {NVScene} from "../NVScene.ts";
import {NVPlayerCharacter} from "../Actors/PlayerCharacter.ts";
import type {Vector3} from "three";


export class NVPlayerPhysics extends NVComponent {

    GRAVITY : number = 12;
    playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
    playerOnFloor: boolean = false;
    playerVelocity = new THREE.Vector3();

    //Where the player gets sent back to after falling below KILL_Z. Captured from wherever the
    //capsule actually starts, so this stays correct without depending on level-spawn wiring.
    private spawnPoint = this.playerCollider.end.clone();

    //UE-style "Kill Z": fall below this world-space height and you're teleported back to spawn
    //instead of falling forever. TODO Make this level-configurable once world settings exist in
    //the level JSON, rather than a fixed global.
    private static readonly KILL_Z : number = -50;

    isSprinting : boolean = false;
    private sprintSpeed : number = 15;
    private walkSpeed : number = 10;

    isFreeFlying : boolean = false;
    private flySpeed : number = 15;

    //Guards against one jump press applying multiple impulses. Space is held-checked every
    //frame (not edge-triggered - free-fly ascend needs continuous input), and playerOnFloor can
    //stay stale/true for a frame or two after the jump impulse is applied, before collision
    //detection catches up and reports the player as airborne. Without this guard, holding Space
    //across that window stacks a second (or third, on a frame hitch) +5 into the same jump,
    //which is exactly what was producing random jump heights.
    private hasJumpedSinceGrounded : boolean = false;

    //Normalized direction the player is trying to move this frame, in world space.
    //Set once per frame by NVPlayerCharacter from accumulated input.
    private wishDirection = new THREE.Vector3();

    //Friction/drag applied to velocity every frame, expressed as a decay rate (units: 1/second).
    private readonly FRICTION : number = 4;

    //Acceleration is tuned to equal FRICTION, which makes walkSpeed/sprintSpeed/flySpeed the
    //actual top speed the player settles at when holding a direction (accel == friction decay
    //rate => steady state speed == moveSpeed). Keep them equal unless you want top speed to
    //drift away from the tuned values.
    private readonly GROUND_ACCELERATION : number = 4;
    //Reduced air control: turning/starting to move mid-air is sluggish compared to the ground,
    //which is standard FPS feel and stops strafing in the air from being "free" extra speed.
    private readonly AIR_ACCELERATION : number = 1.5;

    TickComponent(delta : number){
        this.updatePlayer(delta);
    }

    //Called once per frame with the accumulated, normalized movement input for that frame.
    public SetWishDirection(direction : Vector3){
        this.wishDirection.copy(direction);
    }

    //Applies a jump impulse, but only once per ground contact - see hasJumpedSinceGrounded.
    //Returns whether it actually jumped, in case callers want to react (sound/animation later).
    public TryJump(impulse : number) : boolean {
        if (!this.playerOnFloor || this.hasJumpedSinceGrounded) return false;

        this.playerVelocity.y += impulse;
        this.hasJumpedSinceGrounded = true;
        return true;
    }

    private updatePlayer( deltaTime : number ) {

        this.applyMovementInput(deltaTime);

        if ( !this.playerOnFloor && !this.isFreeFlying) {
            this.playerVelocity.y -= this.GRAVITY * deltaTime;
        }

        //Friction only touches the horizontal plane so falling/jumping stays crisp and isn't
        //quietly bled off by the same drag that slows down walking. Free-flying has no gravity
        //to arrest vertical drift, so it gets damped on all three axes instead.
        const damping : number = Math.exp( -this.FRICTION * deltaTime ) - 1;
        this.playerVelocity.x += this.playerVelocity.x * damping;
        this.playerVelocity.z += this.playerVelocity.z * damping;
        if (this.isFreeFlying) {
            this.playerVelocity.y += this.playerVelocity.y * damping;
        }

        const deltaPosition = this.playerVelocity.clone().multiplyScalar( deltaTime );
        this.playerCollider.translate( deltaPosition );

        //Free-flying (editor mode) is a dev tool for inspecting/moving around the level from
        //anywhere - no collision response (so it can pass straight through geometry) and no
        //KILL_Z respawn.
        if (!this.isFreeFlying) {
            this.playerCollisions();
            this.checkKillZ();
        } else {
            this.playerOnFloor = false;
        }

        NVPlayerCharacter.GetCamera().GetCamera().position.copy( this.playerCollider.end );

    }

    private checkKillZ() {
        if (this.playerCollider.end.y >= NVPlayerPhysics.KILL_Z) return;

        const offset = this.spawnPoint.clone().sub(this.playerCollider.end);
        this.playerCollider.translate(offset);
        this.playerVelocity.set(0, 0, 0);
    }

    private applyMovementInput(deltaTime : number) {

        if (this.wishDirection.lengthSq() === 0) return;

        const moveSpeed : number = this.isFreeFlying
            ? this.flySpeed
            : (this.isSprinting ? this.sprintSpeed : this.walkSpeed);

        const accel : number = this.isFreeFlying || this.playerOnFloor
            ? this.GROUND_ACCELERATION
            : this.AIR_ACCELERATION;

        //deltaTime-scaled so acceleration feels the same regardless of framerate.
        const speedDelta : number = moveSpeed * accel * deltaTime;

        if (this.isFreeFlying) {
            //Free-fly can move on all three axes (including straight up/down).
            this.playerVelocity.addScaledVector(this.wishDirection, speedDelta);
        } else {
            //Grounded/airborne movement never touches vertical velocity directly — that's
            //owned by gravity, jump impulses, and collision response.
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

            //Cancel the velocity component driving into the surface on any contact, not just
            //walls/slopes. Landing on the floor used to leave vertical velocity untouched, so a
            //jump's impulse landed on top of whatever residual fall speed was left over from the
            //previous landing instead of a clean baseline - that's what was making jump height
            //inconsistent (TryJump only guards against re-triggering, not this).
            this.playerVelocity.addScaledVector(result.normal, -result.normal.dot(this.playerVelocity));


            if (result.depth >= 1e-10)
                this.playerCollider.translate(result.normal.multiplyScalar(result.depth));

        }

        //Once we're confirmed airborne (not just mid-jump with a stale collision result from
        //before liftoff), allow the next ground contact to jump again.
        if (!this.playerOnFloor) this.hasJumpedSinceGrounded = false;

    }
}
