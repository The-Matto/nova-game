import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";
import {EditorState, IsGameplayFrozen, PlayerStatics} from "../Utility/PlayerGlobals";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {NVScene} from "../NVScene.ts";

//A mount cube with a blade laid across its top face (half embedded, half poking up), sliding
//back and forth along local Z - rotates with the actor, same +Z-is-forward convention as
//NVCannonActor's muzzle. Touching the blade while it's moving kills the player. Only the cube is
//solid (a platform, and it grows with travelDistance so it always spans the blade's full sweep);
//the blade carries no collision of its own - it's a trigger only, recomputed every frame since
//(unlike NVSpikeActor) it actually translates rather than just extending/retracting in place.
@RegisterClass("NVMovingBladeActor")
export class NVMovingBladeActor extends NVActor {

    private baseComponent : StaticMeshComponent;
    private bladeComponent : StaticMeshComponent;
    //Recomputed every frame from the blade's current world position - see Tick.
    private bladeBounds = new THREE.Box3();

    //Drives the sine sweep - see Tick. Reset (not just frozen) whenever gameplay stops, so the
    //blade is always found at its resting center the instant you pause or retry, not wherever it
    //happened to be mid-swing.
    private age : number = 0;
    private wasFrozen : boolean = true;

    @EditableProperty({min: 0})
    public travelDistance : number = 1.5;

    @EditableProperty({min: 0.1})
    public cycleDuration : number = 2;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.scene = new THREE.Group();

        //Unit geometry, resized via the mesh's own scale (see UpdateBaseSize) - X/Y stay fixed,
        //only Z (the travel axis) changes, and it needs to change live if travelDistance is
        //edited after spawn.
        const baseMaterial = new THREE.MeshStandardMaterial({color: '#4a4a4a'});
        this.baseComponent = new StaticMeshComponent(this, new THREE.BoxGeometry(1, 1, 1), baseMaterial);
        this.UpdateBaseSize();

        //A cylinder rotated flat (its own long axis becomes Z, the same axis it slides along) -
        //centered on the cube's top face, so half its cross-section pokes up above the surface
        //and half is embedded in it, same idea as a spike but lying down instead of standing up.
        const bladeRadius = Math.min(descripter.scale.x, descripter.scale.y) * 0.18;
        //3x the placed Z scale (not the travel-widened base) - long enough to actually read as a
        //blade rather than a stub, without needing to track travelDistance itself.
        const bladeLength = descripter.scale.z * 3;
        const bladeMaterial = new THREE.MeshStandardMaterial({color: '#cc2222', emissive: '#cc2222', emissiveIntensity: 0.3});
        this.bladeComponent = new StaticMeshComponent(
            this,
            new THREE.CylinderGeometry(bladeRadius, bladeRadius, bladeLength, 12),
            bladeMaterial,
            new THREE.Vector3(0, descripter.scale.y / 2, 0),
        );
        this.bladeComponent.mesh.rotation.x = Math.PI / 2;
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    //Only the base cube is solid - the blade is deliberately never added to the world octree
    //(see the class comment), just checked as a trigger each Tick. Also called on an editor
    //gizmo move (see NVScene.RebuildWorldOctree), which is exactly when the base's own baked
    //scale can change.
    public RegisterCollision() {
        NVScene.worldOctree.fromGraphNode(this.baseComponent.mesh);
    }

    //X/Y stay at the placed scale; Z grows to cover the blade's full travelDistance sweep either
    //side of center, plus the original scale as a margin so it doesn't shrink to nothing at
    //travelDistance 0.
    private UpdateBaseSize() {
        const scale = this.spawnDescriptor.scale;
        this.baseComponent.mesh.scale.set(scale.x, scale.y, this.travelDistance * 2 + scale.z);
    }

    //Fires for both a live inspector edit and a saved level loading with a non-default
    //travelDistance (see NVActor.ApplyEditableProperties) - the constructor above only ever sees
    //the field's default.
    public OnEditablePropertyChanged(key : string) : void {
        super.OnEditablePropertyChanged(key);
        if (key !== 'travelDistance') return;

        this.UpdateBaseSize();
        this.RegisterCollision();
    }

    //Same reasoning as the freeze-transition reset in Tick - a retry shouldn't carry over
    //whatever point in the swing the blade was at when the player died.
    public OnPlayerRespawned() : void {
        this.age = 0;
        this.bladeComponent.mesh.position.z = 0;
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        const isFrozen = EditorState.isInEditor || IsGameplayFrozen();

        //The instant gameplay stops for any reason (pause, death, countdown, editor) - not just
        //on an explicit retry - snap back to the resting center rather than freezing mid-swing.
        if (isFrozen) {
            if (!this.wasFrozen) {
                this.age = 0;
                this.bladeComponent.mesh.position.z = 0;
            }
            this.wasFrozen = true;
            return;
        }
        this.wasFrozen = false;

        this.age += deltaTime;
        const frequency = (2 * Math.PI) / this.cycleDuration;
        this.bladeComponent.mesh.position.z = Math.sin(this.age * frequency) * this.travelDistance;

        this.bladeBounds.setFromObject(this.bladeComponent.mesh);

        const playerCollider = PlayerStatics.PlayerCharacter?.GetPhysicsComp().playerCollider;
        if (!playerCollider) return;

        //Expanded by the player's own capsule radius, not just a rounding-error epsilon (compare
        //NVWeapon.HIT_BOUNDS_EPSILON) - the blade is thin, and only checking the capsule's two
        //exact endpoints against its bare bounds made a genuine touch register inconsistently.
        const dangerZone = this.bladeBounds.clone().expandByScalar(playerCollider.radius);
        const touchingBlade = dangerZone.containsPoint(playerCollider.start)
            || dangerZone.containsPoint(playerCollider.end);
        if (touchingBlade) PlayerStatics.PlayerCharacter?.PlayerDeath();
    }
}
