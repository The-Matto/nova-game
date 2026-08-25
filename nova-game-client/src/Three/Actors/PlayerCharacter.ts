import  {NVActor} from "../Actor.ts";
import {NVCamera} from "../Camera.ts";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {type MoveDirection, PlayerController} from "./PlayerController.ts";


import {Vector2, Vector3} from "three";

import {NVPlayerPhysics} from "../Components/NVPlayerPhysics.ts";
import {ReplicatedActor, ReplicatedVariable} from "../Replication.ts";
import {PlayerStatics} from "../Utility/PlayerGlobals";

@RegisterClass("NVPlayerCharacter") @ReplicatedActor(12)
export class NVPlayerCharacter extends NVActor {

    private playerController: PlayerController = new PlayerController(this);
    private static camera: NVCamera = new NVCamera();


    //TODO Maybe use decorator to add components to the component set, rather than using constructor!
    private playerPhysics : NVPlayerPhysics = new NVPlayerPhysics(this);

    //Accumulates this frame's movement input (e.g. W + D held together) before being handed to
    //physics as a single normalized direction, so diagonal movement isn't faster than cardinal.
    private wishDirection : Vector3 = new Vector3();

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
        //Gather this frame's input first so physics acts on it with zero latency, instead of
        //acting on last frame's input.
        this.wishDirection.set(0, 0, 0);
        this.playerController.ProcessInput();

        //Clamp (rather than always normalize) so a single held direction keeps its full speed
        //and only combined directions (e.g. W+D) get scaled down to stop diagonal movement
        //being faster than cardinal movement.
        if (this.wishDirection.lengthSq() > 1) this.wishDirection.normalize();
        this.playerPhysics.SetWishDirection(this.wishDirection);

        super.Tick(_deltaTime);
        //console.log(NVPlayerCharacter.replicateRate)
    }

    AddMovementInput(MoveType: MoveDirection, axisValue: number) {
        switch (MoveType) {
            case "Forward": {
                const forwardVector : Vector3 = this.GetForwardVector();
                //Movement speed should stay constant regardless of camera pitch, so zero out
                //height and renormalize rather than leaving it shrunk by look angle.
                forwardVector.y = 0;
                if (forwardVector.lengthSq() > 0) forwardVector.normalize();
                this.wishDirection.addScaledVector(forwardVector, axisValue);

                break;
            }
            case "Right": {
                this.wishDirection.addScaledVector(this.GetRightVector(), axisValue);
                break;
            }
            case "Up": {
                //Only meaningful while free-flying; physics ignores wishDirection.y otherwise.
                this.wishDirection.y += axisValue;
                break;
            }
        }
    }

    AddLookInput(lookValue: Vector2) {
        NVPlayerCharacter.camera.AddCameraRotation(lookValue)
    }

    Jump(){
        if (this.playerPhysics.isFreeFlying) {
            this.AddMovementInput("Up", 1);
            return;
        }
        this.playerPhysics.TryJump(5);
    }
    Crouch(isStart : boolean){
        if (this.playerPhysics.isFreeFlying && isStart) {
            this.AddMovementInput("Up", -1);
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