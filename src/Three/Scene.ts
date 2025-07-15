
import * as THREE from "three"
import type {NVActor} from "./Actor.ts";
import {PlayerController} from "./Actors/PlayerController.ts";

export class Scene {

    private readonly scene;

    private sceneActors = new Set<NVActor>();

    private PlayerController = new PlayerController();
    constructor() {
        this.scene = new THREE.Scene();

        this.scene.background = new THREE.Color( 0x88ccee );
        this.scene.fog = new THREE.Fog( 0x88ccee, 0, 50 );

    }

    public AddSceneActor(actor : NVActor){
        this.scene.add(actor.MeshRender);
    }

    public GetScene(): THREE.Object3D {
        return this.scene;
    }

    public GetSceneActors() : Set<NVActor>{
        return this.sceneActors;
    }
}