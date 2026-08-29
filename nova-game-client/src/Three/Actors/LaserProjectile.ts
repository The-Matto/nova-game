import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {EditorState, PlayerStatics} from "../Utility/PlayerGlobals";

const LIFETIME = 5;
const SPEED = 25;
//Generous enough to cover the player's own capsule radius plus a frame or two of travel.
const HIT_RADIUS = 0.5;

//A pooled laser bolt fired by NVCannonActor - never placed in level JSON. Flies straight for
//LIFETIME seconds, then deactivates (hidden, inert) instead of being destroyed, ready for
//LaserPool to hand back out on the next shot.
@RegisterClass("NVLaserProjectile")
export class NVLaserProjectile extends NVActor {

    private velocity = new THREE.Vector3();
    private lifeTime : number = 0;
    private isActive : boolean = false;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.scene = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6),
            new THREE.MeshBasicMaterial({color: '#ff3355'}),
        );
        this.scene.visible = false;
    }

    public get IsActive() : boolean {
        return this.isActive;
    }

    //A bolt still flying when the player respawns shouldn't be able to kill them again the
    //instant they reappear - same reasoning as NVCannonActor resetting its own fire timer.
    public OnPlayerRespawned() : void {
        if (this.isActive) this.Deactivate();
    }

    //(Re)activates this projectile from `origin`, travelling along `direction`.
    public FireFrom(origin : THREE.Vector3, direction : THREE.Vector3) {
        this.scene.position.copy(origin);
        this.scene.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        this.velocity.copy(direction).multiplyScalar(SPEED);
        this.lifeTime = 0;
        this.isActive = true;
        this.scene.visible = true;
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);
        if (!this.isActive) return;

        this.scene.position.addScaledVector(this.velocity, deltaTime);

        if (!EditorState.isInEditor && this.HitsPlayer()) {
            PlayerStatics.PlayerCharacter?.PlayerDeath();
            this.Deactivate();
            return;
        }

        this.lifeTime += deltaTime;
        if (this.lifeTime >= LIFETIME) this.Deactivate();
    }

    //Distance from this projectile's tip to the closest point on the player's capsule segment.
    private HitsPlayer() : boolean {
        const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
        if (!physics) return false;

        const collider = physics.playerCollider;
        const closest = new THREE.Line3(collider.start, collider.end)
            .closestPointToPoint(this.scene.position, true, new THREE.Vector3());
        return this.scene.position.distanceTo(closest) <= HIT_RADIUS + collider.radius;
    }

    private Deactivate() {
        this.isActive = false;
        this.scene.visible = false;
    }
}

//Reuses an inactive NVLaserProjectile instead of spawning/destroying one per shot.
export class LaserPool {
    private static pool : NVLaserProjectile[] = [];

    public static Fire(origin : THREE.Vector3, direction : THREE.Vector3) {
        let projectile = LaserPool.pool.find(p => !p.IsActive);
        if (!projectile) {
            //Persistent: survives level reloads, so the pool never loses track of it.
            projectile = NVScene.SpawnActor({
                class: "NVLaserProjectile",
                location: new THREE.Vector3(),
                scale: new THREE.Vector3(1, 1, 1),
            }, true) as NVLaserProjectile;
            LaserPool.pool.push(projectile);
        }
        projectile.FireFrom(origin, direction);
    }
}
