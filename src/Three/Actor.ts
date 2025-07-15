
import * as THREE from "three";

//Base class which every game object inherits from
export class NVActor {

    //Called when object is spawned
    BeginPlay() : void {};

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