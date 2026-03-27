
import * as THREE from "three"
import type {NVActor} from "./Actor.ts";
import {ClassRegistry, type SpawnDescriptor} from "./ClassDescripter.ts";
import {SceneBuilder} from "./SceneBuilder.ts";
import {Octree} from "three/examples/jsm/math/Octree.js";

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

        const fillLight1 = new THREE.HemisphereLight( 0x8dc1de, 0x00668d, 1.5 );
        fillLight1.position.set( 2, 1, 1 );
        Scene.scene.add( fillLight1 );

        const directionalLight = new THREE.DirectionalLight( 0xffffff, 2.5 );
        directionalLight.position.set( - 5, 25, - 1 );
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.left = - 30;
        directionalLight.shadow.camera.top	= 30;
        directionalLight.shadow.camera.bottom = - 30;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.radius = 4;
        directionalLight.shadow.bias = - 0.00006;
        Scene.scene.add( directionalLight );
    }

    public static AddSceneActor(actor : NVActor){
        Scene.scene.add(actor.scene);
    }

    public GetScene(): THREE.Object3D {
        return Scene.scene;
    }

    public GetSceneActors() : Set<NVActor>{
        return Scene.sceneActors;
    }

    public static SpawnActor(descripter : SpawnDescriptor) : NVActor {
        const ClassRef: unknown = ClassRegistry.get(descripter.class);
        const CreatedObj : unknown = new ClassRef(descripter);

        const classType : NVActor = (ClassRef as NVActor.prototype);
        console.log(ClassRef.name)
        if (ClassRef.replicates){
            console.log("THIS OBJECT IS REPLICATED", ClassRef);
        }
        const actor : NVActor = (CreatedObj as NVActor);
        this.AddSceneActor(actor);
        this.sceneActors.add(actor);


        actor.SetWorldLocation(descripter.location)

        actor.Init(descripter);
        //actor.UpdateCollision();
        console.log("Spawned actor - ", descripter.class);
        return actor;
    }
}