import {NVActor} from "../Actor.ts";

import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {Scene} from "../Scene.ts";
import {OctreeHelper} from "three/examples/jsm/helpers/OctreeHelper";
import {AssetManager} from "../Utility/AssetManager.ts";
import {ReplicatedActor, ReplicatedVariable} from "../Replication.ts";


@RegisterClass("NVStaticMeshActor") @ReplicatedActor(51)
export class NVStaticMeshActor extends NVActor{


    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);

       // console.log(NVStaticMeshActor.replicatedProperties);
    }
    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        //TODO Fetch model from URL
        //TODO create an asset manager to ensure we only load each model once.

        if (descripter.properties?.modelPath) {
        //    this.LoadModel(descripter.properties?.modelPath.toString())
        }
        else {
            const geometry = new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z);
            const material = new THREE.MeshStandardMaterial({color: '#c79b9b'});
            this.scene = new THREE.Mesh(geometry, material);
        }
       // Scene.AddSceneActor(this);



        const helper = new OctreeHelper(Scene.worldOctree);
        helper.visible = true;
        Scene.scene.add(helper);
    }

    private async LoadModel(modelPath : string)  {
        this.scene = await AssetManager.RequestModel(modelPath);
        Scene.scene.add(this.scene);
    }

    public async Init(descripter : SpawnDescriptor){

        if (descripter.properties?.modelPath) {
            await this.LoadModel(descripter.properties?.modelPath.toString())
        }
        super.Init(descripter);
    }

   @ReplicatedVariable
   repTest : number = 20;

}