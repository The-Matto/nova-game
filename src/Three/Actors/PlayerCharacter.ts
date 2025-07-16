import  {NVActor} from "../Actor.ts";
import {NVCamera} from "../Camera.ts";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {type MoveDirection, PlayerController} from "./PlayerController.ts";

import * as THREE from "three";
import {Vector2} from "three";
import {Scene} from "../Scene.ts";
import {Capsule} from "three/examples/jsm/math/Capsule";

@RegisterClass("NVPlayerCharacter")
export class NVPlayerCharacter extends NVActor {

    private playerController: PlayerController = new PlayerController(this);
    private static camera: NVCamera = new NVCamera();

    static GetCamera(): NVCamera {
        return this.camera;
    }

    constructor(_Descripter: SpawnDescriptor) {
        super(_Descripter);
        this.MeshRender = NVPlayerCharacter.camera.GetCamera();
    }

    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);

        this.playerController.ProcessInput();
        this.updatePlayer(_deltaTime);
    }

    AddMovementInput(MoveType: MoveDirection, axisValue: number) {
        switch (MoveType) {
            case "Forward": {
                this.playerVelocity.add( this.GetForwardVector().multiplyScalar(axisValue));
                break;
            }
            case "Right": {
                this.playerVelocity.add( this.GetRightVector().multiplyScalar(axisValue));
                break;
            }
        }
    }

    AddLookInput(lookValue: Vector2) {
        NVPlayerCharacter.camera.AddCameraRotation(lookValue)
    }

    playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
    playerOnFloor: boolean = false;
    playerVelocity = new THREE.Vector3();

    private playerCollisions() {

        const result = Scene.worldOctree.capsuleIntersect(this.playerCollider);

        this.playerOnFloor = false;


        if (result) {

            this.playerOnFloor = result.normal.y > 0;

            if (!this.playerOnFloor) {

                this.playerVelocity.addScaledVector(result.normal, -result.normal.dot(this.playerVelocity));

            }

            if (result.depth >= 1e-10) {

                this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
            }

        }

    }

    GRAVITY : number = 1;
    private updatePlayer( deltaTime ) {

        let damping = Math.exp( - 4 * deltaTime ) - 1;

        if ( ! this.playerOnFloor ) {

            this.playerVelocity.y -= this.GRAVITY * deltaTime;

            // small air resistance
            damping *= 0.1;

        }

        this.playerVelocity.addScaledVector( this.playerVelocity, damping );

        const deltaPosition = this.playerVelocity.clone().multiplyScalar( deltaTime );
        this.playerCollider.translate( deltaPosition );

        this.playerCollisions();

        NVPlayerCharacter.camera.GetCamera().position.copy( this.playerCollider.end );

    }

    public UpdateCollision(){

    }
}