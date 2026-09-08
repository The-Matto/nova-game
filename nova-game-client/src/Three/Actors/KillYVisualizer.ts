import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";

//Huge rather than truly infinite, but comfortably bigger than CameraSettings.farClip (1000) in
//every direction from anywhere near the level's origin - reads as infinite in practice.
const PLANE_SIZE = 4000;
//Tiles the texture across that huge span instead of stretching one image over the whole thing.
const TEXTURE_REPEAT = 200;
//UV units/second the texture scrolls by, both axes - see Tick. Reads as slowly flowing lava
//instead of a static image.
const PAN_SPEED = .3;

//Drop the real art at public/T_Lava.png - loads as a plain white plane until it's there, same as
//any other missing texture in this project.
const LAVA_TEXTURE = new THREE.TextureLoader().load('/T_Lava.png');
LAVA_TEXTURE.wrapS = LAVA_TEXTURE.wrapT = THREE.RepeatWrapping;
LAVA_TEXTURE.repeat.set(TEXTURE_REPEAT, TEXTURE_REPEAT);

//One persistent instance, spawned by NVScene's constructor - a flat lava plane always sitting at
//Y = the level's current killY, so falling below it reads as "into the lava" rather than an
//invisible boundary. Visible in both editor and real gameplay; purely visual, not solid.
@RegisterClass("NVKillYVisualizer")
export class NVKillYVisualizer extends NVActor {

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const geometry = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE);
        const material = new THREE.MeshStandardMaterial({
            map: LAVA_TEXTURE,
            emissive: '#ff4500',
            emissiveIntensity: 0.3,
        });
        this.scene = new THREE.Mesh(geometry, material);
        //PlaneGeometry starts facing +Z - lay it flat, facing up.
        this.scene.rotation.x = -Math.PI / 2;

        //Not added to NVScene.worldOctree - purely visual, nothing to collide with (checkKillY
        //already kills the player by Y alone, well before they'd visually reach this).
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
    }

    //Tracks worldSettings.killY live - follows a level's own value on load, and any live edit
    //from EditorWorldSettingsPanel's Kill Height slider, with no extra wiring needed.
    Tick(deltaTime : number) {
        super.Tick(deltaTime);
        this.scene.position.y = NVScene.worldSettings.killY;

        //Wrapped rather than left to grow unbounded - RepeatWrapping would render the same
        //either way, this just keeps the float from drifting over a long session.
        LAVA_TEXTURE.offset.x = (LAVA_TEXTURE.offset.x + deltaTime * PAN_SPEED) % 1;
        LAVA_TEXTURE.offset.y = (LAVA_TEXTURE.offset.y + deltaTime * PAN_SPEED) % 1;
    }
}
