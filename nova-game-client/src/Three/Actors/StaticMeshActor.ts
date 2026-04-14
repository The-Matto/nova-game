import {NVActor} from "../Actor.ts";

import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {AssetManager} from "../Utility/AssetManager.ts";
import {ReplicatedActor, ReplicatedVariable} from "../Replication.ts";

//import {OctreeHelper} from "three/examples/jsm/helpers/OctreeHelper";


@RegisterClass("NVStaticMeshActor") @ReplicatedActor(51)
export class NVStaticMeshActor extends NVActor{


    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);

       // console.log(NVStaticMeshActor.replicatedProperties);
    }
    constructor(descripter : SpawnDescriptor) {
        super(descripter);


        if (!descripter.properties?.modelPath) {
            const geometry = new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z);
            const material = new THREE.MeshStandardMaterial({color: '#c79b9b'});
            this.scene = new THREE.Mesh(geometry, material);
            NVScene.worldOctree.fromGraphNode(this.scene);

            //Debug view for the box Collision
            //const helper = new OctreeHelper(Scene.worldOctree);
            //helper.visible = true;
            //Scene.scene.add(helper);
        }
       // Scene.AddSceneActor(this);


    }

    private async LoadModel(modelPath : string)  {
        this.scene = await AssetManager.RequestModel(modelPath);
        NVScene.scene.add(this.scene);
    }

    public async Init(descripter : SpawnDescriptor){

        if (descripter.properties?.modelPath) {
            await this.LoadModel(descripter.properties?.modelPath.toString())
        }
        this.SetWorldLocation(descripter.location);

        //Generate mesh collision - TODO: Would be cool to support a system like UCX from Unreal
        NVScene.worldOctree.fromGraphNode(this.scene);

    }

   @ReplicatedVariable
   repTest : number = 20;

}