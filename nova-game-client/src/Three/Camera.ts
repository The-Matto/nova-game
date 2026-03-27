import * as THREE from "three";
import {CameraSettings, WindowSettings} from "./Utility/PlayerGlobals.ts";


export class NVCamera {


    protected camera = new THREE.PerspectiveCamera( CameraSettings.fov,
        WindowSettings.windowWidth / WindowSettings.windowHeight, CameraSettings.nearClip, CameraSettings.farClip);

    constructor() {
        //Fix gimbal lock
        this.camera.rotation.order = 'YXZ';
    }

    public AddCameraRotation(addRotation : THREE.Vector2) {

        this.GetCamera().rotation.y += -addRotation.x;

        //Limit pitch to 90 degrees
        const radians = THREE.MathUtils.degToRad(90);
        this.GetCamera().rotation.x = Math.max(-radians, Math.min(radians, (this.GetCamera().rotation.x + -addRotation.y)));
    }

    GetCamera = (): THREE.PerspectiveCamera => {return this.camera;}
}