
import * as THREE from "three";
import type {SpawnDescriptor} from "./ClassDescripter.ts";
import type {NVComponent} from "./Components/NVComponent.ts";

//Base class which every game object inherits from
export class NVActor {

    components : Set<NVComponent> = new Set();

    constructor(_Descripter : SpawnDescriptor) {

    }
    //Called when object is spawned
    BeginPlay() : void {
        for (const component in this.components) {
            component.BeginPlay();
        }
    };

    //Called when object is destroyed
    BeginDestroy() : void {};

    //Called every game frame
    Tick(_deltaTime : number) : void {};

    CanCallTick() : boolean {
        //TODO Check this actor isnt be destroyed and has tick enabled
        return true;
    }
    public SetWorldLocation(newLocation : THREE.Vector3) : void {
        this.MeshRender.position.set(newLocation.x, newLocation.y, newLocation.z);
    };

    //TODO Make this private
    public MeshRender : THREE.Object3D = new THREE.Object3D();

    //TODO Add component list!

}