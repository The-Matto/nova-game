
import * as THREE from "three";
import type {SpawnDescriptor} from "./ClassDescripter.ts";
import type {NVComponent} from "./Components/NVComponent.ts";
import {Vector3} from "three";
import {NVScene} from "./NVScene.ts";

//Base class which every game object inherits from
export class NVActor {

    components : Set<NVComponent> = new Set();

    //Kept so ToSpawnDescriptor() can round-trip scale/properties (nothing edits those yet)
    //while location is read live from `scene`.
    public spawnDescriptor : SpawnDescriptor;

    constructor(descripter : SpawnDescriptor) {
        this.spawnDescriptor = descripter;
    }


    //Should this Actor be considered for replication
    static replicates : boolean = false;
    //List of properties on this Actor that will be replicated
    static replicatedProperties : Set<string>
    static replicateRate : number = 0;

    //Called when object is spawned
    BeginPlay() : void {

    };

    public GetForwardVector() : Vector3 {
        const forward = new Vector3();
        this.scene.getWorldDirection(forward);
        return forward;
    }

    public GetRightVector() : Vector3 {
        const right = new Vector3();
        this.scene.getWorldDirection(right);
        right.y = 0;
        right.normalize();
        right.cross(new Vector3(0,1,0));
        return right;
    }

    //Called when object is destroyed
    BeginDestroy() : void {};

    //Registers this actor's mesh with the world collision octree. No-op by default - override
    //for real collision (see NVStaticMeshActor). Also what NVScene.RebuildWorldOctree() calls on
    //every actor after something moves, since the octree can't be updated in place.
    public RegisterCollision() : void {
    }

    //Detaches `scene` from its parent. NVPawn overrides this to a no-op since its `scene` is the
    //shared MainCamera.
    public RemoveFromScene() : void {
        this.scene.parent?.remove(this.scene);
    }

    //A SpawnDescriptor that would recreate this actor in its current state - see
    //NVScene.SerializeLevel().
    public ToSpawnDescriptor() : SpawnDescriptor {
        return {
            class: this.spawnDescriptor.class,
            location: this.scene.position.clone(),
            scale: this.spawnDescriptor.scale,
            properties: this.spawnDescriptor.properties,
        };
    }

    //Called every game frame
    Tick(_deltaTime : number) : void {
        for (const comp of this.components){
            comp.TickComponent(_deltaTime);
        }
    };

    CanCallTick() : boolean {
        //TODO Check this actor isnt be destroyed and has tick enabled
        return true;
    }
    public SetWorldLocation(newLocation : THREE.Vector3) : void {
        this.scene.position.set(newLocation.x, newLocation.y, newLocation.z);
    };

    //TODO Make this private
    public scene : THREE.Object3D = new THREE.Object3D();

    //TODO Add component list!

    //TODO DEPRECATE This function
    public UpdateCollision(){
        NVScene.worldOctree.fromGraphNode(this.scene);

    }

    public async Init(descripter : SpawnDescriptor){
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();

    }
}