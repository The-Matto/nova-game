import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import type {IShootable} from "../Gameplay/Shootable.ts";
import {ColorSwitchState, type SwitchColor} from "../Gameplay/ColorSwitch.ts";

const COLOR_HEX : Record<SwitchColor, string> = {
    red: '#e63946',
    blue: '#3d84e6',
};

//A shootable block that flips ColorSwitchState between red/blue every time it's hit - always
//solid itself, tinted to show the currently active color as the level's own indicator.
@RegisterClass("NVSwitchButtonActor")
export class NVSwitchButtonActor extends NVActor implements IShootable {

    private static readonly GLOW_INTENSITY = 0.8;

    public bounds = new THREE.Box3();
    private readonly material : THREE.MeshStandardMaterial;
    private readonly unsubscribe : () => void;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const hex = COLOR_HEX[ColorSwitchState.GetActive()];
        this.material = new THREE.MeshStandardMaterial({
            color: hex,
            emissive: hex,
            emissiveIntensity: NVSwitchButtonActor.GLOW_INTENSITY,
        });
        this.scene = new THREE.Mesh(
            new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z),
            this.material,
        );

        this.unsubscribe = ColorSwitchState.Subscribe(active => this.ApplyColor(active));
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    public RegisterCollision() {
        NVScene.worldOctree.fromGraphNode(this.scene);
        this.bounds.setFromObject(this.scene);
    }

    public RegisterHit() : void {
        ColorSwitchState.Toggle();
        NVScene.RebuildWorldOctree();
    }

    private ApplyColor(active : SwitchColor) {
        const hex = COLOR_HEX[active];
        this.material.color.set(hex);
        this.material.emissive.set(hex);
    }

    //A mid-run toggle shouldn't carry over into a fresh attempt - cubes react to this via their
    //own ColorSwitchState subscription, no need to touch them directly here.
    public OnPlayerRespawned() : void {
        ColorSwitchState.Reset();
    }

    public BeginDestroy() {
        super.BeginDestroy();
        this.unsubscribe();
    }
}
