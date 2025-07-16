import  {NVActor} from "../Actor.ts";
import {NVCamera} from "../Camera.ts";
import {RegisterClass} from "../ClassDescripter.ts";
import {type MoveDirection, PlayerController} from "./PlayerController.ts";

import {Vector2} from "three";

@RegisterClass("NVPlayerCharacter")
export class NVPlayerCharacter extends NVActor {

    private playerController : PlayerController = new PlayerController(this);
    private static camera : NVCamera = new NVCamera();

    static GetCamera() : NVCamera {
        return this.camera;
    }


    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);

        this.playerController.ProcessInput();
    }

    AddMovementInput(MoveType : MoveDirection, axisValue : number){
        switch(MoveType){
            case "Forward":
            {
                NVPlayerCharacter.GetCamera().GetCamera().position.z += -axisValue;
                break;
            }
            case "Right":{
                NVPlayerCharacter.GetCamera().GetCamera().position.x += axisValue;
                break;
            }
        }
    }

    AddLookInput(lookValue : Vector2){
        NVPlayerCharacter.GetCamera().GetCamera().rotation.y += -lookValue.x;
        NVPlayerCharacter.GetCamera().GetCamera().rotation.x += -lookValue.y;
    }
}