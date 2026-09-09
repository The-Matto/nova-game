import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";
import {EditorState, IsGameplayFrozen, PlayerStatics} from "../Utility/PlayerGlobals";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {NVScene} from "../NVScene.ts";

//A mount cube with a blade sliding back and forth along local Z on top of it - touching the
//blade kills the player. Only the base cube is solid; the blade is trigger-only, recomputed each frame.
@RegisterClass("NVMovingBladeActor")
export class NVMovingBladeActor extends NVActor {

    private baseComponent : StaticMeshComponent;
    private bladeComponent : StaticMeshComponent;
    //Recomputed every frame from the blade's current world position - see Tick.
    private bladeBounds = new THREE.Box3();

    //Drives the sine sweep - see Tick. Only reset on an actual retry (OnPlayerRespawned), not
    //just on pausing - the blade should hold wherever it was, not jump back to center.
    private age : number = 0;

    @EditableProperty({min: 0})
    public travelDistance : number = 1.5;

    @EditableProperty({min: 0.1})
    public cycleDuration : number = 2;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.scene = new THREE.Group();

        //Unit geometry, resized via the mesh's own scale (see UpdateBaseSize) - X/Y stay fixed,
        //only Z (the travel axis) changes, live if travelDistance is edited after spawn.
        const baseMaterial = new THREE.MeshStandardMaterial({color: '#4a4a4a'});
        this.baseComponent = new StaticMeshComponent(this, new THREE.BoxGeometry(1, 1, 1), baseMaterial);
        this.UpdateBaseSize();

        //A cylinder rotated onto its side (axle along local X) so it reads as a wheel rolling
        //across the cube's top face - centered there so half its profile pokes up, half is embedded.
        const bladeRadius = Math.min(descripter.scale.y, descripter.scale.z) * 0.35;
        //A short axle depth, not a long rod - just enough to read as a wheel's thickness.
        const bladeLength = descripter.scale.x * 0.5;
        const bladeMaterial = new THREE.MeshStandardMaterial({color: '#cc2222', emissive: '#cc2222', emissiveIntensity: 0.3});
        this.bladeComponent = new StaticMeshComponent(
            this,
            new THREE.CylinderGeometry(bladeRadius, bladeRadius, bladeLength, 24),
            bladeMaterial,
            new THREE.Vector3(0, descripter.scale.y / 2, 0),
        );
        this.bladeComponent.mesh.rotation.z = Math.PI / 2;
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    //Only the base cube is solid - the blade is never added to the world octree (see class
    //comment), just checked as a trigger each Tick. Also runs on an editor gizmo move.
    public RegisterCollision() {
        NVScene.worldOctree.fromGraphNode(this.baseComponent.mesh);
    }

    //X/Y stay at the placed scale; Z grows to cover the full travelDistance sweep either side of
    //center, plus the original scale as a margin so it doesn't shrink to nothing at 0.
    private UpdateBaseSize() {
        const scale = this.spawnDescriptor.scale;
        this.baseComponent.mesh.scale.set(scale.x, scale.y, this.travelDistance * 2 + scale.z);
    }

    //Fires for both a live inspector edit and a saved level with a non-default travelDistance -
    //the constructor above only ever sees the field's default.
    public OnEditablePropertyChanged(key : string) : void {
        super.OnEditablePropertyChanged(key);
        if (key !== 'travelDistance') return;

        this.UpdateBaseSize();
        this.RegisterCollision();
    }

    //A retry shouldn't carry over whatever point in the swing the blade was at when the player
    //died - unlike a mere pause, which holds position instead (see Tick).
    public OnPlayerRespawned() : void {
        this.age = 0;
        this.bladeComponent.mesh.position.z = 0;
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        //Paused/dead/counting down/editor - hold the blade exactly where it is rather than
        //animating. Only an actual retry (OnPlayerRespawned) resets it back to center.
        if (EditorState.isInEditor || IsGameplayFrozen()) return;

        this.age += deltaTime;
        const frequency = (2 * Math.PI) / this.cycleDuration;
        this.bladeComponent.mesh.position.z = Math.sin(this.age * frequency) * this.travelDistance;

        this.bladeBounds.setFromObject(this.bladeComponent.mesh);

        const playerCollider = PlayerStatics.PlayerCharacter?.GetPhysicsComp().playerCollider;
        if (!playerCollider) return;

        //Expanded by the player's own capsule radius, not just a rounding-error epsilon - the
        //blade is thin, and checking only the capsule's two exact endpoints was inconsistent.
        const dangerZone = this.bladeBounds.clone().expandByScalar(playerCollider.radius);
        const touchingBlade = dangerZone.containsPoint(playerCollider.start)
            || dangerZone.containsPoint(playerCollider.end);
        if (touchingBlade) PlayerStatics.PlayerCharacter?.PlayerDeath();
    }
}
