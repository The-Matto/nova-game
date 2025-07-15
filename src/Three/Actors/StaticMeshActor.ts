import {NVActor} from "../Actor.ts";

import * as THREE from "three";
import {Scene} from "../Scene.ts";
import {RegisterClass} from "../ClassDescripter.ts";



@RegisterClass("NVStaticMeshActor")
export class NVStaticMeshActor extends NVActor{


    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);
    }
    constructor() {
        super();

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        this.MeshRender = new THREE.Mesh(geometry, material);
        Scene.AddSceneActor(this);
    }


}