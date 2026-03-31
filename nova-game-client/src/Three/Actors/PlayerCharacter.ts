import  {NVActor} from "../Actor.ts";
import {NVCamera} from "../Camera.ts";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {type MoveDirection, PlayerController} from "./PlayerController.ts";


import {Vector2, type Vector3} from "three";

import {NVPlayerPhysics} from "../Components/NVPlayerPhysics.ts";
import {ReplicatedActor, ReplicatedVariable} from "../Replication.ts";
import {PlayerStatics} from "../Utility/PlayerGlobals";

@RegisterClass("NVPlayerCharacter") @ReplicatedActor(12)
export class NVPlayerCharacter extends NVActor {

    private playerController: PlayerController = new PlayerController(this);
    private static camera: NVCamera = new NVCamera();


    //TODO Maybe use decorator to add components to the component set, rather than using constructor!
    private playerPhysics : NVPlayerPhysics = new NVPlayerPhysics(this);

    GetPhysicsComp(): NVPlayerPhysics {
        return this.playerPhysics;
    }

    static GetCamera(): NVCamera {
        return this.camera;
    }

    constructor(_Descripter: SpawnDescriptor) {
        super(_Descripter);

        this.components.add(this.playerPhysics)

        this.scene = NVPlayerCharacter.camera.GetCamera();

        PlayerStatics.PlayerCharacter = this;
    }


    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);
        this.playerController.ProcessInput();
        //console.log(NVPlayerCharacter.replicateRate)
    }

    AddMovementInput(MoveType: MoveDirection, axisValue: number) {
        switch (MoveType) {
            case "Forward": {
                const forwardVector : Vector3 = this.GetForwardVector().multiplyScalar(axisValue);
                //Zero out height movement
                forwardVector.y = 0;
                this.playerPhysics.AddVelocity(forwardVector);

                break;
            }
            case "Right": {
                this.playerPhysics.AddVelocity(this.GetRightVector().multiplyScalar(axisValue))
                break;
            }
        }
    }

    AddLookInput(lookValue: Vector2) {
        NVPlayerCharacter.camera.AddCameraRotation(lookValue)
    }

    Jump(){
        if (this.playerPhysics.playerOnFloor)
            this.playerPhysics.playerVelocity.y += 5;
        else if (this.playerPhysics.isFreeFlying)
            this.playerPhysics.playerVelocity.y += 0.05;

    }
    Crouch(isStart : boolean){
        if (!this.playerPhysics.playerOnFloor && isStart)
        {
            if (this.playerPhysics.isFreeFlying)
                this.playerPhysics.playerVelocity.y -= 0.05;
        }
    }
    Sprint(isStart : boolean){
        this.playerPhysics.isSprinting = isStart;
    }
    public UpdateCollision(){

    }

    @ReplicatedVariable
    playerRepTest : boolean = false;
}