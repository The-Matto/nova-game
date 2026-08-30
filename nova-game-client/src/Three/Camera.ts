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

    //Cosmetic screen roll while strafing - see NVWeapon.Tick, the only current caller.
    public SetRoll(radians : number) {
        this.camera.rotation.z = radians;
    }

    //Resets to a specific yaw, zeroing pitch - used when spawning at an NVPlayerSpawn marker so
    //the player starts facing the way its arrow points.
    public SetYaw(yawRadians : number) {
        this.camera.rotation.set(0, yawRadians, 0);
    }
}

//Shared across whichever pawn is currently possessed, rather than owned by one actor class.
export const MainCamera = new NVCamera();