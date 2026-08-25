import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {LevelObjectives, type ILevelObjective} from "../Gameplay/LevelObjectives.ts";

//A shootable cube - starts red, turns pink when hit by NVWeapon's line trace (see NVWeapon.Fire,
//which finds the hit target by bounds-checking the trace's impact point against `bounds`).
//Registers itself as a level objective so NVGoalVolume won't let the player finish until every
//target in the level has been hit.
@RegisterClass("NVTargetActor")
export class NVTargetActor extends NVActor implements ILevelObjective {

    private static readonly DEFAULT_COLOR : string = '#e0473f';
    private static readonly HIT_COLOR : string = '#ff5fc9';

    //Just for a readable per-target name in the goal's "still to do" hint.
    private static nextIndex : number = 1;

    public readonly label : string;
    private material : THREE.MeshStandardMaterial;
    private hasBeenHit : boolean = false;

    //Kept up to date by RegisterCollision (also called on editor gizmo moves - see
    //NVScene.RebuildWorldOctree) so NVWeapon can bounds-check a trace's impact point against it.
    public bounds = new THREE.Box3();

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.label = `Target ${NVTargetActor.nextIndex++}`;

        const geometry = new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z);
        this.material = new THREE.MeshStandardMaterial({color: NVTargetActor.DEFAULT_COLOR});
        this.scene = new THREE.Mesh(geometry, this.material);
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    BeginPlay() {
        super.BeginPlay();
        LevelObjectives.Register(this);
    }

    BeginDestroy() {
        super.BeginDestroy();
        LevelObjectives.Unregister(this);
    }

    public RegisterCollision() {
        NVScene.worldOctree.fromGraphNode(this.scene);
        this.bounds.setFromObject(this.scene);
    }

    public RegisterHit() {
        this.hasBeenHit = true;
        this.material.color.set(NVTargetActor.HIT_COLOR);
    }

    public IsComplete() : boolean {
        return this.hasBeenHit;
    }
}
