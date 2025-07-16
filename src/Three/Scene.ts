
import * as THREE from "three"
import type {NVActor} from "./Actor.ts";
import {ClassRegistry, type SpawnDescriptor} from "./ClassDescripter.ts";
import {SceneBuilder} from "./SceneBuilder.ts";
import {Octree} from "three/examples/jsm/math/Octree";

export class Scene {

    public static scene : THREE.Scene;

    private static sceneActors = new Set<NVActor>();

    public static worldOctree : Octree

    constructor() {
        Scene.scene = new THREE.Scene();

        Scene.scene.background = new THREE.Color( 0x88ccee );
        Scene.scene.fog = new THREE.Fog( 0x88ccee, 0, 1000 );

        new SceneBuilder("/TestWorld.json");

        Scene.worldOctree = new Octree();


    }

    public static AddSceneActor(actor : NVActor){
        Scene.scene.add(actor.MeshRender);
    }

    public GetScene(): THREE.Object3D {
        return Scene.scene;
    }

    public GetSceneActors() : Set<NVActor>{
        return Scene.sceneActors;
    }

    public static SpawnActor(Descripter : SpawnDescriptor) : NVActor {
        const ClassRef: unknown = ClassRegistry.get(Descripter.class);
        const CreatedObj : unknown = new ClassRef(Descripter);
        const Actor : NVActor = (CreatedObj as NVActor);
        this.AddSceneActor(Actor);
        this.sceneActors.add(Actor);



        Actor.SetWorldLocation(Descripter.location)

        Actor.UpdateCollision();
        console.log("Spawned actor - ", Descripter.class);
        return Actor;
    }
}