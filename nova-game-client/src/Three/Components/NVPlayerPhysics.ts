import {NVComponent} from "./NVComponent.ts";
import {Capsule} from "three/examples/jsm/math/Capsule";
import * as THREE from "three";
import {Scene} from "../Scene.ts";
import {NVPlayerCharacter} from "../Actors/PlayerCharacter.ts";
import type {Vector3} from "three";


export class NVPlayerPhysics extends NVComponent {

    GRAVITY : number = 12;
    playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
    playerOnFloor: boolean = false;
    playerVelocity = new THREE.Vector3();
    playerMoveSpeed : number = 1;

    isSprinting : boolean = false;
    private sprintSpeed : number = 8;
    private walkSpeed : number = 5;

    isFreeFlying : boolean = false;

    TickComponent(delta : number){
        this.updatePlayer(delta);
    }

    public AddVelocity(velocity : Vector3){

        const moveSpeed : number = this.isSprinting ? this.sprintSpeed : this.walkSpeed;
        velocity.multiplyScalar(moveSpeed)
        this.playerVelocity.add(velocity);
    }

    private updatePlayer( deltaTime : number ) {

        let damping : number = Math.exp( - 4 * deltaTime ) - 1;

        if ( !this.playerOnFloor && !this.isFreeFlying) {

            this.playerVelocity.y -= this.GRAVITY * deltaTime;

            // small air resistance
            //damping *= .5;

        }
        //this.playerVelocity.multiplyScalar(this.playerMoveSpeed);

        this.playerVelocity.addScaledVector( this.playerVelocity, damping );
        const deltaPosition = this.playerVelocity.clone().multiplyScalar( deltaTime );
        this.playerCollider.translate( deltaPosition );

        this.playerCollisions();

        NVPlayerCharacter.GetCamera().GetCamera().position.copy( this.playerCollider.end );

    }

    private playerCollisions() {

        const result = Scene.worldOctree.capsuleIntersect(this.playerCollider);
        this.playerOnFloor = false;

        if (result) {

            this.playerOnFloor = result.normal.y > 0;

            if (!this.playerOnFloor)
                this.playerVelocity.addScaledVector(result.normal, -result.normal.dot(this.playerVelocity));


            if (result.depth >= 1e-10)
                this.playerCollider.translate(result.normal.multiplyScalar(result.depth));

        }

    }

    public SetMoveSpeed(newSpeed: number){
        this.playerMoveSpeed = newSpeed;
    }
}