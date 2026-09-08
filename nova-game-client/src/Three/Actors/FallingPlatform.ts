import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {EditorState, IsGameplayFrozen, PlayerStatics} from "../Utility/PlayerGlobals";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import type {NVPlayerPhysics} from "../Components/NVPlayerPhysics.ts";

//Shared by every falling platform instance - one texture, loaded once from public/ (same pattern
//as NVTargetActor's TARGET_TEXTURE).
const FALLING_PLATFORM_TEXTURE = new THREE.TextureLoader().load('/T_Fallingplatform.png');

//A cube platform that warns (color change) then falls and hides itself once stood on too long.
//OnPlayerRespawned puts it back together, so a death can't permanently strand a level.
@RegisterClass("FallingPlatform")
export class NVFallingPlatform extends NVActor {

    private bounds = new THREE.Box3();
    private material : THREE.MeshStandardMaterial;
    private standTime : number = 0;
    private warningTime : number = 0;
    private isWarning : boolean = false;
    private isFalling : boolean = false;
    private fallTime : number = 0;
    private fallVelocity : number = 0;

    //Matches NVPlayerPhysics.GRAVITY.
    private static readonly GRAVITY = 12;
    private static readonly DEACTIVATE_AFTER_FALLING = 5;
    private static readonly WARNING_DURATION = 0.25;
    private static readonly IDLE_COLOR = '#8a6d3b';
    private static readonly WARNING_COLOR = '#c0392b';

    @EditableProperty({min: 0})
    public fallDelay : number = .05;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const geometry = new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z);
        this.material = new THREE.MeshStandardMaterial({color: NVFallingPlatform.IDLE_COLOR, map: FALLING_PLATFORM_TEXTURE});
        this.scene = new THREE.Mesh(geometry, this.material);
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    //Left out of the octree while falling - see StartFalling.
    public RegisterCollision() {
        this.bounds.setFromObject(this.scene);
        if (!this.isFalling) NVScene.worldOctree.fromGraphNode(this.scene);
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        if (!this.scene.visible) return;
        //Covers editor mode and dead/paused/counting-down - warning/falling shouldn't progress,
        //and standing shouldn't start counting, while the world's otherwise frozen.
        if (EditorState.isInEditor || IsGameplayFrozen()) return;

        if (this.isFalling) {
            this.fallVelocity += NVFallingPlatform.GRAVITY * deltaTime;
            this.scene.position.y -= this.fallVelocity * deltaTime;

            this.fallTime += deltaTime;
            if (this.fallTime >= NVFallingPlatform.DEACTIVATE_AFTER_FALLING) this.scene.visible = false;
            return;
        }

        if (this.isWarning) {
            this.warningTime += deltaTime;
            if (this.warningTime >= NVFallingPlatform.WARNING_DURATION) this.StartFalling();
            return;
        }

        const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
        if (!physics) return;

        if (this.IsPlayerStandingOnTop(physics)) {
            this.standTime += deltaTime;
            if (this.standTime >= this.fallDelay) this.StartWarning();
        } else {
            this.standTime = 0;
        }
    }

    //Position-based, not physics.playerOnFloor - that flag flickers every frame at rest (see
    //NVPlayerPhysics), so it can't be trusted here.
    private IsPlayerStandingOnTop(physics : NVPlayerPhysics) : boolean {
        const collider = physics.playerCollider;
        const footY = collider.start.y - collider.radius;
        const withinFootprint = collider.start.x >= this.bounds.min.x && collider.start.x <= this.bounds.max.x
            && collider.start.z >= this.bounds.min.z && collider.start.z <= this.bounds.max.z;

        return withinFootprint && Math.abs(footY - this.bounds.max.y) < 0.1;
    }

    private StartWarning() {
        this.isWarning = true;
        this.warningTime = 0;
        this.material.color.set(NVFallingPlatform.WARNING_COLOR);
    }

    private StartFalling() {
        this.isWarning = false;
        this.isFalling = true;
        NVScene.RebuildWorldOctree();
    }

    public OnPlayerRespawned() : void {
        if (!this.isFalling && !this.isWarning && this.scene.visible) return;

        this.isWarning = false;
        this.isFalling = false;
        this.standTime = 0;
        this.warningTime = 0;
        this.fallTime = 0;
        this.fallVelocity = 0;
        this.scene.visible = true;
        this.material.color.set(NVFallingPlatform.IDLE_COLOR);
        this.SetWorldLocation(this.spawnDescriptor.location);
        this.RegisterCollision();
    }
}
