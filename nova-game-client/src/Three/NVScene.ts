
import * as THREE from "three"
import type {NVActor} from "./Actor.ts";
import {ClassRegistry, type LevelData, type SpawnDescriptor, type WorldSettings} from "./ClassDescripter.ts";
import {SceneBuilder} from "./SceneBuilder.ts";
import {Octree} from "three/examples/jsm/math/Octree.js";

import {LevelObjectives} from "./Gameplay/LevelObjectives";
import {EditorSelection} from "./Editor/EditorSelection";
import {MainCamera} from "./Camera.ts";
import {EditorState, LevelSelection} from "./Utility/PlayerGlobals.ts";
import {GameEvents} from "./Utility/GameEvents.ts";

//Matches what every level used before this was configurable.
export const DEFAULT_WORLD_SETTINGS : WorldSettings = {skyColor: "#88ccee", killY: -50, fogDistance: 100, lavaRiseSpeed: 0};

//Editor-only ceiling on a single level's actor count (see EditorSpawning/EditorSelection, which
//are the only spawn paths that check it - gameplay-spawned actors like projectiles aren't gated).
export const MAX_LEVEL_ACTORS = 1000;

export class NVScene {

    public static scene : THREE.Scene;

    //Everything a level spawns lives under this group, swapped for a fresh one on ReloadLevel().
    public static levelRoot : THREE.Group = new THREE.Group();

    private static sceneActors = new Set<NVActor>();

    //Actors that survive ReloadLevel() - currently just the editor pawn.
    private static persistentActors = new Set<NVActor>();

    public static worldOctree : Octree

    public static worldSettings : WorldSettings = {...DEFAULT_WORLD_SETTINGS};

    private static currentLevelPath : string;

    //Resolves once the initial level JSON has finished spawning - see
    //PlayInEditor.Initialize's "play" branch, which needs the spawn marker before frame one.
    public static initialLoadPromise : Promise<void>;

    constructor() {
        NVScene.scene = new THREE.Scene();

        NVScene.ApplyWorldSettings(NVScene.worldSettings);
        NVScene.scene.add(NVScene.levelRoot);
        //Parented once, up front, regardless of which pawn possesses it later - see
        //AddSceneActor's "already parented" check.
        NVScene.scene.add(MainCamera.GetCamera());

        NVScene.worldOctree = new Octree();

        //Persistent (survives level reloads) - always tracks the current killY, see
        //NVKillYVisualizer.Tick. Not level content, so it's not spawned from level JSON.
        NVScene.SpawnActor({
            class: "NVKillYVisualizer",
            location: new THREE.Vector3(0, NVScene.worldSettings.killY, 0),
            scale: new THREE.Vector3(1, 1, 1),
        }, true);

        NVScene.initialLoadPromise = NVScene.LoadLevel(LevelSelection.selectedLevelPath);


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

    //Updates the live scene (background/fog) and remembers the values for SerializeLevel() -
    //called both on initial load and live from EditorWorldSettingsPanel as the editor drags a
    //value, same "mutate the live instance directly" pattern as EditorInspectorPanel.
    public static ApplyWorldSettings(settings : WorldSettings){
        //Merged over the defaults rather than trusted as complete - a level saved before a
        //WorldSettings field existed (e.g. lavaRiseSpeed) still has an object here, just missing
        //that one key, so a bare assignment would leave it undefined instead of falling back.
        NVScene.worldSettings = {...DEFAULT_WORLD_SETTINGS, ...settings};
        NVScene.scene.background = new THREE.Color(NVScene.worldSettings.skyColor);
        NVScene.scene.fog = new THREE.Fog(NVScene.worldSettings.skyColor, 0, NVScene.worldSettings.fogDistance);
    }

    //Spawns every actor described by `data` - shared by SceneBuilder (level JSON fetched from
    //disk) and LoadFromSnapshot (an in-memory snapshot, see NVScene.SerializeLevel()).
    public static SpawnActorsFromData(data : LevelData){
        NVScene.ApplyWorldSettings(data.worldSettings ?? {...DEFAULT_WORLD_SETTINGS});
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

        //BeginDestroy(), not just dropping the reference - actors that register themselves with a
        //static/module-level list on BeginPlay (e.g. NVTargetActor.allTargets) rely on it to
        //unregister, or that state leaks into the next level/session (see LevelObjectives.Clear()
        //below, needed for the same reason before that pattern existed).
        for (const actor of [...NVScene.sceneActors]) {
            if (NVScene.persistentActors.has(actor)) continue;
            NVScene.sceneActors.delete(actor);
            actor.BeginDestroy();
        }

        NVScene.worldOctree = new Octree();
        LevelObjectives.Clear();
        EditorSelection.ClearSelection();
        NVScene.NotifyActorCountChanged();
    }

    //Despawns everything the level spawned and respawns fresh from the same JSON file.
    public static async ReloadLevel() : Promise<void> {
        NVScene.ResetLevelState();
        await NVScene.LoadLevel(NVScene.currentLevelPath);
    }

    //Same as ReloadLevel, but respawns from an in-memory snapshot (see SerializeLevel) instead
    //of re-fetching from disk - lets PIE edits survive without touching the level file.
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
        return {actorsToSpawn, worldSettings: {...NVScene.worldSettings}};
    }

    public static GetSceneActors() : Set<NVActor>{
        return NVScene.sceneActors;
    }

    //Excludes persistent actors (the editor pawn) - matches what SerializeLevel actually saves.
    public static GetLevelActorCount() : number {
        return NVScene.sceneActors.size - NVScene.persistentActors.size;
    }

    public static CanSpawnMoreLevelActors() : boolean {
        return NVScene.GetLevelActorCount() < MAX_LEVEL_ACTORS;
    }

    private static NotifyActorCountChanged() {
        GameEvents.Emit('levelActorCountChanged', {count: NVScene.GetLevelActorCount(), max: MAX_LEVEL_ACTORS});
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
        actor.ApplyEditableProperties(descripter.properties);
        this.AddSceneActor(actor, persistent);
        this.sceneActors.add(actor);
        if (persistent) this.persistentActors.add(actor);


        actor.SetWorldLocation(descripter.location)
        if (descripter.rotation) actor.SetWorldRotation(descripter.rotation);
        //Lets EditorSelection walk up from a raycast hit to the owning actor. Re-tagged in
        //NVStaticMeshActor.LoadModel too, since that swaps `scene` out for a loaded model.
        actor.scene.userData.nvActor = actor;

        //BeginPlay waits for Init (async, e.g. loading a model) to finish, and is skipped entirely
        //in editor mode - see BeginPlayForLevelActors, which fires it once PIE actually starts.
        actor.Init(descripter).then(() => {
            if (!EditorState.isInEditor) actor.TryBeginPlay();
        });
        console.log("Spawned actor - ", descripter.class);
        NVScene.NotifyActorCountChanged();
        return actor;
    }

    //Gives BeginPlay() to actors placed while still in editor mode (see SpawnActor).
    //TryBeginPlay() guards against double-firing on ones spawned fresh mid-play instead.
    public static BeginPlayForLevelActors(){
        for (const actor of NVScene.sceneActors) {
            if (!NVScene.persistentActors.has(actor)) actor.TryBeginPlay();
        }
    }

    //Despawns an actor and rebuilds collision so it doesn't linger as a phantom hit. Leaving the
    //scene graph is up to actor.RemoveFromScene() (a pawn no-ops it, sharing the camera).
    public static DestroyActor(actor : NVActor){
        NVScene.sceneActors.delete(actor);
        NVScene.persistentActors.delete(actor);
        actor.RemoveFromScene();
        actor.BeginDestroy();
        NVScene.RebuildWorldOctree();
        NVScene.NotifyActorCountChanged();
    }
}