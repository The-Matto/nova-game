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
            //"properties": { "shape": "sphere" } picks a primitive other than the default box.
            const shape = (descripter.properties?.shape as string) ?? 'cube';
            const geometry = shape === 'sphere'
                ? new THREE.SphereGeometry(descripter.scale.x / 2, 24, 16)
                : new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z);
            //"properties": { "color": "#rrggbb" } overrides the default per-actor.
            const color = (descripter.properties?.color as string) ?? '#c79b9b';
            const material = new THREE.MeshStandardMaterial({color});
            this.scene = new THREE.Mesh(geometry, material);
            //Not registered with worldOctree here - the mesh is still at the origin until
            //Init() below runs SetWorldLocation.

            //Debug view for the box Collision
            //const helper = new OctreeHelper(Scene.worldOctree);
            //helper.visible = true;
            //Scene.scene.add(helper);
        }
       // Scene.AddSceneActor(this);


    }

    private async LoadModel(modelPath : string)  {
        this.scene = await AssetManager.RequestModel(modelPath);
        //Re-tag: NVScene.SpawnActor tagged the old placeholder Object3D before this swapped
        //`scene` out for the loaded model, so EditorSelection would otherwise walk up from a
        //click on this model to nothing.
        this.scene.userData.nvActor = this;
        //levelRoot, not scene directly, so this gets torn down along with everything else on
        //NVScene.ReloadLevel().
        NVScene.levelRoot.add(this.scene);
    }

    public async Init(descripter : SpawnDescriptor){

        if (descripter.properties?.modelPath) {
            await this.LoadModel(descripter.properties?.modelPath.toString())
        }
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();

    }

    //TODO: Would be cool to support a system like UCX from Unreal for custom collision shapes.
    public RegisterCollision() {
        NVScene.worldOctree.fromGraphNode(this.scene);
    }

   @ReplicatedVariable
   repTest : number = 20;

}