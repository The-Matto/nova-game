
import * as THREE from "three";
import type {Callback} from "./Helpers.ts";
import type { NVScene } from "./NVScene.ts";
import type {NVCamera} from "./Camera.ts";
import {MainCamera} from "./Camera.ts";
import {WindowSettings} from "./Utility/PlayerGlobals.ts";


export class NVRenderer {


    //preserveDrawingBuffer - without it, canvas.toDataURL() (level thumbnail capture, see
    //EditorPalettePanel) can read back blank/garbage pixels once the buffer's been swapped.
    renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});

    canvas: HTMLDivElement = null;

    constructor(TickFunction: Callback) {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(WindowSettings.windowWidth, WindowSettings.windowHeight);
        this.renderer.setAnimationLoop(TickFunction);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        //Keeps the canvas and camera aspect matching the actual window - WindowSettings only
        //reads window.innerWidth/Height once at module load otherwise.
        window.addEventListener('resize', () => {
            WindowSettings.windowWidth = window.innerWidth;
            WindowSettings.windowHeight = window.innerHeight;
            this.renderer.setSize(WindowSettings.windowWidth, WindowSettings.windowHeight);

            const camera = MainCamera.GetCamera();
            camera.aspect = WindowSettings.windowWidth / WindowSettings.windowHeight;
            camera.updateProjectionMatrix();
        });
    }

    public RenderFrame(scene: NVScene, camera: NVCamera){
        this.renderer.render(scene.GetScene(), camera.GetCamera())
    }
}