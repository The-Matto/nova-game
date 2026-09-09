import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";
import {EditorState, IsGameplayFrozen, PlayerStatics} from "../Utility/PlayerGlobals";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {NVScene} from "../NVScene.ts";

//A mount cube with a thin blade poking half out of its top face, sliding back and forth along
//local Z (rotates with the actor, same +Z-is-forward convention as NVCannonActor's muzzle) -
//touching the blade while it's moving kills the player. The cube itself is solid (a platform);
//the blade is a trigger, recomputed every frame since (unlike NVSpikeActor) it actually
//translates rather than just extending/retracting in place.
@RegisterClass("NVMovingBladeActor")
export class NVMovingBladeActor extends NVActor {

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

        const baseMaterial = new THREE.MeshStandardMaterial({color: '#4a4a4a'});
        new StaticMeshComponent(this, new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z), baseMaterial);

        //Thin and tall enough that exactly half of it sits above the cube's top face - see the Y
        //offset below.
        const bladeRadius = Math.min(descripter.scale.x, descripter.scale.z) * 0.1;
        const bladeHeight = descripter.scale.y;
        const bladeMaterial = new THREE.MeshStandardMaterial({color: '#cc2222', emissive: '#cc2222', emissiveIntensity: 0.3});
        this.bladeComponent = new StaticMeshComponent(
            this,
            new THREE.CylinderGeometry(bladeRadius, bladeRadius, bladeHeight, 12),
            bladeMaterial,
            new THREE.Vector3(0, descripter.scale.y / 2, 0),
        );
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    //Only the base cube is solid - the blade is a trigger, checked separately each Tick since it
    //moves. Also called on an editor gizmo move (see NVScene.RebuildWorldOctree).
    public RegisterCollision() {
        NVScene.worldOctree.fromGraphNode(this.scene);
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

        const touchingBlade = this.bladeBounds.containsPoint(playerCollider.start)
            || this.bladeBounds.containsPoint(playerCollider.end);
        if (touchingBlade) PlayerStatics.PlayerCharacter?.PlayerDeath();
    }
}
