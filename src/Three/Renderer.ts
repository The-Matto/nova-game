
import * as THREE from "three";
import type {Callback} from "./Helpers.ts";
import type { Scene } from "./Scene.ts";
import type {NVCamera} from "./Camera.ts";


export class NVRenderer {


    renderer = new THREE.WebGLRenderer({antialias: true});

    constructor(TickFunction: Callback) {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setAnimationLoop(TickFunction);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;


    }

    public RenderFrame(scene: Scene, camera: NVCamera){
        this.renderer.render(scene.GetScene(), camera.GetCamera())
    }
}