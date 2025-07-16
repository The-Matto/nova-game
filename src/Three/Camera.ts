import * as THREE from "three";


export class NVCamera {

    //TODO make this 16:9
    protected camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000);

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