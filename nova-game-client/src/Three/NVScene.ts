
import * as THREE from "three"
import type {NVActor} from "./Actor.ts";
import {ClassRegistry, type SpawnDescriptor} from "./ClassDescripter.ts";
import {SceneBuilder} from "./SceneBuilder.ts";
import {Octree} from "three/examples/jsm/math/Octree.js";
import {TransformControls} from "three/examples/jsm/controls/TransformControls";

import {NVPlayerCharacter} from "./Actors/PlayerCharacter";
import {Game} from "./Game";
import {LevelObjectives} from "./Gameplay/LevelObjectives";
import {EditorSelection} from "./Editor/EditorSelection";

export class NVScene {

    public static scene : THREE.Scene;

    //Everything a level spawns (actors, loaded models) lives under this group, never added to
    //`scene` directly. ReloadLevel() swaps it for a fresh one so a full reset is just "drop this
    //group and rebuild it" without touching lights or anything else set up once at startup.
    public static levelRoot : THREE.Group = new THREE.Group();

    private static sceneActors = new Set<NVActor>();

    public static worldOctree : Octree

    //Path of the level currently loaded, so ReloadLevel() knows what to reload.
    private static currentLevelPath : string;

    constructor() {
        NVScene.scene = new THREE.Scene();

        NVScene.scene.background = new THREE.Color( 0x88ccee );
        NVScene.scene.fog = new THREE.Fog( 0x88ccee, 0, 1000 );
        NVScene.scene.add(NVScene.levelRoot);

        NVScene.worldOctree = new Octree();

        NVScene.LoadLevel("/TestWorld.json");


        const fillLight1 = new THREE.HemisphereLight( 0x8dc1de, 0x00668d, 1.5 );
        fillLight1.position.set( 2, 1, 1 );
        NVScene.scene.add( fillLight1 );

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
        NVScene.scene.add( directionalLight );



    }

    public static AddSceneActor(actor : NVActor){
        NVScene.levelRoot.add(actor.scene);
    }

    public GetScene(): THREE.Object3D {
        return NVScene.scene;
    }

    //Spawns the actors from a level JSON. Also what the constructor calls for the initial level.
    public static LoadLevel(path : string){
        NVScene.currentLevelPath = path;
        new SceneBuilder(path);
    }

    //Resets the current level back to its initial state: despawns everything the level spawned
    //(actors, loaded models), clears the collision octree and objective tracking, then respawns
    //fresh from the same level JSON. Lights, the camera, and anything else set up once outside
    //the level JSON are untouched.
    public static ReloadLevel(){
        NVScene.scene.remove(NVScene.levelRoot);
        NVScene.levelRoot = new THREE.Group();
        NVScene.scene.add(NVScene.levelRoot);

        NVScene.sceneActors.clear();
        NVScene.worldOctree = new Octree();
        LevelObjectives.Clear();
        //Whatever was selected belonged to an actor that just got despawned - the gizmo would
        //otherwise be left attached to an orphaned, invisible Object3D.
        EditorSelection.ClearSelection();

        NVScene.LoadLevel(NVScene.currentLevelPath);
    }

    public static GetSceneActors() : Set<NVActor>{
        return NVScene.sceneActors;
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
        //Tags the root Object3D so EditorSelection can walk up from a raycast hit to find the
        //actor that owns it. Re-tagged in NVStaticMeshActor.LoadModel too, since that swaps
        //`scene` out for a loaded model after this point.
        actor.scene.userData.nvActor = actor;

        actor.Init(descripter);
        //actor.UpdateCollision();
        console.log("Spawned actor - ", descripter.class);
        return actor;
    }
}