import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";

//Marks where NVPlayerCharacter gets spawned when Playing In Editor starts (see
//PlayInEditor.StartPlaying).
@RegisterClass("NVPlayerSpawn")
export class NVPlayerSpawn extends NVActor {

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const geometry = new THREE.CapsuleGeometry(0.35, 1, 4, 8);
        const material = new THREE.MeshStandardMaterial({
            color: '#4fc3f7',
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
        });
        this.scene = new THREE.Mesh(geometry, material);
    }
}
