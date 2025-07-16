import {NVActor} from "../Actor.ts";

import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";



@RegisterClass("NVStaticMeshActor")
export class NVStaticMeshActor extends NVActor{


    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);
    }
    constructor(Descripter : SpawnDescriptor) {
        super(Descripter);

        //TODO Fetch model from URL
        //TODO create an asset manager to ensure we only load each model once.

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.MeshRender = new THREE.Mesh(geometry, material);
       // Scene.AddSceneActor(this);
    }


}