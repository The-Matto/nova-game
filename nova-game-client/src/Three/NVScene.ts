
import * as THREE from "three"
import type {NVActor} from "./Actor.ts";
import {ClassRegistry, type LevelData, type SpawnDescriptor} from "./ClassDescripter.ts";
import {SceneBuilder} from "./SceneBuilder.ts";
import {Octree} from "three/examples/jsm/math/Octree.js";

import {LevelObjectives} from "./Gameplay/LevelObjectives";
import {EditorSelection} from "./Editor/EditorSelection";
import {MainCamera} from "./Camera.ts";

export class NVScene {

    public static scene : THREE.Scene;

    //Everything a level spawns lives under this group, swapped for a fresh one on ReloadLevel().
    public static levelRoot : THREE.Group = new THREE.Group();

    private static sceneActors = new Set<NVActor>();

    //Actors that survive ReloadLevel() - currently just the editor pawn.
    private static persistentActors = new Set<NVActor>();

    public static worldOctree : Octree

    private static currentLevelPath : string;

    //Resolves once the initial level JSON has finished spawning - see
    //PlayInEditor.Initialize's "play" branch, which needs the spawn marker before frame one.
    public static initialLoadPromise : Promise<void>;

    constructor() {
        NVScene.scene = new THREE.Scene();

        NVScene.scene.background = new THREE.Color( 0x88ccee );
        NVScene.scene.fog = new THREE.Fog( 0x88ccee, 0, 1000 );
        NVScene.scene.add(NVScene.levelRoot);
        //Parented once, up front, regardless of which pawn possesses it later - see
        //AddSceneActor's "already parented" check.
        NVScene.scene.add(MainCamera.GetCamera());

        NVScene.worldOctree = new Octree();

        NVScene.initialLoadPromise = NVScene.LoadLevel("/TestWorld.json");


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

    public static AddSceneActor(actor : NVActor, persistent : boolean = false){
        //Pawns share one camera as their `scene` - if it's already parented, leave it alone
        //rather than reparenting it away from whichever pawn currently owns it.
        if (actor.scene.parent) return;

        if (persistent) {
            NVScene.scene.add(actor.scene);
        } else {
            NVScene.levelRoot.add(actor.scene);
        }
    }

    public GetScene(): THREE.Object3D {
        return NVScene.scene;
    }

    //Returns a promise that resolves once every actor in the level JSON has spawned.
    public static LoadLevel(path : string) : Promise<void> {
        NVScene.currentLevelPath = path;
        return new SceneBuilder(path).ready;
    }

    //Spawns every actor described by `data` - shared by SceneBuilder (level JSON fetched from
    //disk) and LoadFromSnapshot (an in-memory snapshot, see NVScene.SerializeLevel()).
    public static SpawnActorsFromData(data : LevelData){
        data.actorsToSpawn.forEach((entry : SpawnDescriptor) => {
            NVScene.SpawnActor(entry);
        });
    }

    //Drops everything the level spawned (actors, loaded models, collision, objectives,
    //selection) except persistent actors - shared by ReloadLevel and LoadFromSnapshot.
    private static ResetLevelState(){
        NVScene.scene.remove(NVScene.levelRoot);
        NVScene.levelRoot = new THREE.Group();
        NVScene.scene.add(NVScene.levelRoot);

        for (const actor of [...NVScene.sceneActors]) {
            if (!NVScene.persistentActors.has(actor)) NVScene.sceneActors.delete(actor);
        }

        NVScene.worldOctree = new Octree();
        LevelObjectives.Clear();
        EditorSelection.ClearSelection();
    }

    //Despawns everything the level spawned and respawns fresh from the same JSON file.
    public static async ReloadLevel() : Promise<void> {
        NVScene.ResetLevelState();
        await NVScene.LoadLevel(NVScene.currentLevelPath);
    }

    //Same as ReloadLevel, but respawns from an in-memory snapshot instead of re-fetching from
    //disk - see NVScene.SerializeLevel() and PlayInEditor, which uses this so editor edits
    //survive a Play In Editor session without ever touching the original level file.
    public static LoadFromSnapshot(data : LevelData){
        NVScene.ResetLevelState();
        NVScene.SpawnActorsFromData(data);
    }

    //Snapshots every non-persistent actor's current state as level JSON data.
    public static SerializeLevel() : LevelData {
        const actorsToSpawn : SpawnDescriptor[] = [];
        for (const actor of NVScene.sceneActors) {
            if (NVScene.persistentActors.has(actor)) continue;
            actorsToSpawn.push(actor.ToSpawnDescriptor());
        }
        return {actorsToSpawn};
    }

    public static GetSceneActors() : Set<NVActor>{
        return NVScene.sceneActors;
    }

    //Rebuilds the collision octree from every actor's current transform - needed after an actor
    //moves, since the octree bakes world-space positions at registration and can't update them.
    public static RebuildWorldOctree(){
        NVScene.worldOctree = new Octree();
        for (const actor of NVScene.sceneActors) {
            actor.RegisterCollision();
        }
    }

    //`persistent` actors survive ReloadLevel() and are parented under `scene` rather than
    //`levelRoot`.
    public static SpawnActor(descripter : SpawnDescriptor, persistent : boolean = false) : NVActor {
        const ClassRef: unknown = ClassRegistry.get(descripter.class);
        const CreatedObj : unknown = new ClassRef(descripter);

        if (ClassRef.replicates){
            console.log("THIS OBJECT IS REPLICATED", ClassRef);
        }
        const actor : NVActor = (CreatedObj as NVActor);
        this.AddSceneActor(actor, persistent);
        this.sceneActors.add(actor);
        if (persistent) this.persistentActors.add(actor);


        actor.SetWorldLocation(descripter.location)
        //Lets EditorSelection walk up from a raycast hit to the owning actor. Re-tagged in
        //NVStaticMeshActor.LoadModel too, since that swaps `scene` out for a loaded model.
        actor.scene.userData.nvActor = actor;

        actor.Init(descripter);
        console.log("Spawned actor - ", descripter.class);
        return actor;
    }

    //Despawns an actor. Leaving the scene graph is up to actor.RemoveFromScene() (a pawn
    //no-ops it, since its `scene` is the shared camera). Also rebuilds the collision octree,
    //since a deleted actor's collision would otherwise stick around as a phantom hit.
    public static DestroyActor(actor : NVActor){
        NVScene.sceneActors.delete(actor);
        NVScene.persistentActors.delete(actor);
        actor.RemoveFromScene();
        actor.BeginDestroy();
        NVScene.RebuildWorldOctree();
    }
}