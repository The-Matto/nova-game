import * as THREE from "three";
import {NVStaticMeshActor} from "./Actors/StaticMeshActor.ts";
//Nova
export class NVCamera {

    //TODO make this 16:9
    protected camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000);

    GetCamera = (): THREE.PerspectiveCamera => {return this.camera;}
}