import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {LevelObjectives, type ILevelObjective} from "../Gameplay/LevelObjectives.ts";
import type {IShootable} from "../Gameplay/Shootable.ts";

//Shared by every target instance - one texture, loaded once from public/.
const TARGET_TEXTURE = new THREE.TextureLoader().load('/T_NV_Target.png');

//A shootable disc (a cylinder rotated so its flat faces point forward/back, rim black) - each
//face starts white (texture shown as-is, opaque), goes full black when hit (see NVWeapon.Fire).
//Registers itself as a level objective so NVGoalVolume won't let the player finish until every
//target's been hit.
@RegisterClass("NVTargetActor")
export class NVTargetActor extends NVActor implements ILevelObjective, IShootable {

    private static readonly DEFAULT_COLOR : string = '#ffffff';
    private static readonly HIT_COLOR : string = '#000000';
    //Emissive, not bloom (no post-processing pipeline exists) - self-lit brightness on the
    //texture's own colors, off entirely once hit.
    private static readonly GLOW_INTENSITY : number = 1.5;

    //Just for a readable per-target name in the goal's "still to do" hint.
    private static nextIndex : number = 1;

    //Every target currently in play - lets things like NVDoorActor ask "how many have been hit"
    //without needing a reference to specific targets.
    private static allTargets : NVTargetActor[] = [];

    public readonly label : string;
    private material : THREE.MeshStandardMaterial;
    private hasBeenHit : boolean = false;

    //Kept up to date by RegisterCollision (also called on editor gizmo moves - see
    //NVScene.RebuildWorldOctree) so NVWeapon can bounds-check a trace's impact point against it.
    public bounds = new THREE.Box3();

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.label = `Target ${NVTargetActor.nextIndex++}`;

        //Cylinder's own axis starts vertical (Y) - rotate it onto Z so the textured caps face
        //forward/back like a shooting-range disc, instead of up/down.
        const radius = descripter.scale.x / 2;
        const geometry = new THREE.CylinderGeometry(radius, radius, descripter.scale.z, 24);
        geometry.rotateX(Math.PI / 2);

        //Cap material (index 1 and 2) is the same instance on both faces, so RegisterHit only
        //needs to touch it once.
        this.material = new THREE.MeshStandardMaterial({
            color: NVTargetActor.DEFAULT_COLOR,
            map: TARGET_TEXTURE,
            emissive: '#ffffff',
            emissiveMap: TARGET_TEXTURE,
            emissiveIntensity: NVTargetActor.GLOW_INTENSITY,
        });
        const sideMaterial = new THREE.MeshStandardMaterial({color: '#000000'});
        this.scene = new THREE.Mesh(geometry, [sideMaterial, this.material, this.material]);
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    BeginPlay() {
        super.BeginPlay();
        LevelObjectives.Register(this);
        NVTargetActor.allTargets.push(this);
    }

    BeginDestroy() {
        super.BeginDestroy();
        LevelObjectives.Unregister(this);
        const index = NVTargetActor.allTargets.indexOf(this);
        if (index !== -1) NVTargetActor.allTargets.splice(index, 1);
    }

    //Live count, not a separately-tracked tally - can't drift out of sync with individual
    //targets' own hasBeenHit/respawn state. See NVDoorActor.targetsBeforeOpen.
    public static GetHitCount() : number {
        return NVTargetActor.allTargets.filter(t => t.hasBeenHit).length;
    }

    public RegisterCollision() {
        NVScene.worldOctree.fromGraphNode(this.scene);
        this.bounds.setFromObject(this.scene);
    }

    public RegisterHit() {
        this.hasBeenHit = true;
        this.material.color.set(NVTargetActor.HIT_COLOR);
        this.material.emissiveIntensity = 0;
    }

    public IsComplete() : boolean {
        return this.hasBeenHit;
    }

    public OnPlayerRespawned() : void {
        if (!this.hasBeenHit) return;
        this.hasBeenHit = false;
        this.material.color.set(NVTargetActor.DEFAULT_COLOR);
        this.material.emissiveIntensity = NVTargetActor.GLOW_INTENSITY;
    }
}
