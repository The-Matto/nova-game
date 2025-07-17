import {NVActor} from "../Actor.ts";

import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {Scene} from "../Scene.ts";
import {OctreeHelper} from "three/examples/jsm/helpers/OctreeHelper";
import {AssetManager} from "../Utility/AssetManager.ts";


@RegisterClass("NVStaticMeshActor")
export class NVStaticMeshActor extends NVActor{


    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);
    }
    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        //TODO Fetch model from URL
        //TODO create an asset manager to ensure we only load each model once.

        if (descripter.properties?.modelPath) {
            this.LoadModel(descripter.properties?.modelPath.toString())
        }
        else {
            const geometry = new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z);
            const material = new THREE.MeshStandardMaterial({color: '#c79b9b'});
            this.MeshRender = new THREE.Mesh(geometry, material);
        }
       // Scene.AddSceneActor(this);



        const helper = new OctreeHelper(Scene.worldOctree);
        helper.visible = true;
        Scene.scene.add(helper);
    }

    private async LoadModel(modelPath : string)  {
        this.MeshRender = await AssetManager.RequestModel(modelPath);
        Scene.scene.add(this.MeshRender);
    }

}