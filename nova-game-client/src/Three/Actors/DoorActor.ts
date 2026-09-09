import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {EditorState, IsGameplayFrozen} from "../Utility/PlayerGlobals";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {NVTargetActor} from "./TargetActor.ts";

//A solid door that lerps toward openOffset (relative to where it's placed) once at least
//targetsBeforeOpen targets in the level have been shot (see NVTargetActor.GetHitCount) - no
//per-door target linking needed. Blocks movement/bullets while closed; left out of the world
//octree once open, same as NVFallingPlatform while falling.
@RegisterClass("NVDoorActor")
export class NVDoorActor extends NVActor {

    //Fraction of its full travel the door covers per second while opening.
    private static readonly OPEN_SPEED : number = 4;
    //How many multiples of its own height the door used to rise when fully open, before
    //openOffset existed - only used now to give a freshly-placed door a sensible default below.
    private static readonly OPEN_HEIGHT_MULTIPLIER : number = 2;
    private static readonly COLOR : string = '#5a5a6a';

    @EditableProperty({min: 0, isInteger: true})
    public targetsBeforeOpen : number = 1;

    //Where the door ends up once fully open, relative to wherever it's placed - defaulted below
    //(not as a field initializer) since it depends on the placed scale.
    @EditableProperty()
    public openOffset : THREE.Vector3 = new THREE.Vector3();

    //0 = closed, 1 = fully open - lerped toward, not snapped.
    private openAmount : number = 0;
    private isOpen : boolean = false;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const geometry = new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z);
        const material = new THREE.MeshStandardMaterial({color: NVDoorActor.COLOR});
        this.scene = new THREE.Mesh(geometry, material);

        //Matches the old hardcoded "straight up by 2x height" behavior - a level saved before
        //openOffset existed has no override in its JSON, so this is the only default it'll ever
        //see and needs to reproduce what was already there. Overwritten below by
        //ApplyEditableProperties if the level actually does have a saved value.
        this.openOffset = new THREE.Vector3(0, descripter.scale.y * NVDoorActor.OPEN_HEIGHT_MULTIPLIER, 0);
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    //Left out of the octree once open - like NVFallingPlatform while falling.
    public RegisterCollision() {
        if (!this.isOpen) NVScene.worldOctree.fromGraphNode(this.scene);
    }

    public OnPlayerRespawned() : void {
        if (!this.isOpen && this.openAmount === 0) return;

        this.isOpen = false;
        this.openAmount = 0;
        this.scene.position.copy(this.spawnDescriptor.location);
        NVScene.RebuildWorldOctree();
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        if (EditorState.isInEditor || IsGameplayFrozen()) return;

        if (!this.isOpen && NVTargetActor.GetHitCount() >= this.targetsBeforeOpen) {
            this.isOpen = true;
            NVScene.RebuildWorldOctree();
        }

        if (!this.isOpen || this.openAmount >= 1) return;

        this.openAmount = Math.min(1, this.openAmount + deltaTime * NVDoorActor.OPEN_SPEED);
        this.scene.position.copy(this.spawnDescriptor.location).addScaledVector(this.openOffset, this.openAmount);
    }
}
