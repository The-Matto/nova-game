
import * as THREE from "three"
import type {NVActor} from "./Actor.ts";
import {ClassRegistry, type SpawnDescriptor} from "./ClassDescripter.ts";
import {SceneBuilder} from "./SceneBuilder.ts";

export class Scene {

    private static scene : THREE.Scene;

    private static sceneActors = new Set<NVActor>();

    constructor() {
        Scene.scene = new THREE.Scene();

        Scene.scene.background = new THREE.Color( 0x88ccee );
        Scene.scene.fog = new THREE.Fog( 0x88ccee, 0, 50 );

        new SceneBuilder("/TestWorld.json");
       // const a : SpawnDescriptor = {class : "NVPlayerCharacter", location: new THREE.Vector3(1,1,1) };
       // this.SpawnActor(a);

    }

    public static AddSceneActor(actor : NVActor){
        console.log("AddSceneActor", actor);
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

        const CreatedObj : unknown = new ClassRef();

        const Actor : NVActor = (CreatedObj as NVActor);
        this.AddSceneActor(Actor);
        this.sceneActors.add(Actor);

        Actor.SetWorldLocation(Descripter.location)

        console.log("Spawn actor - ", Descripter.class);
        return Actor;
    }
}