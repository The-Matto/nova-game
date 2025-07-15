import  {NVActor} from "../Actor.ts";
import {NVCamera} from "../Camera.ts";
import {RegisterClass} from "../ClassDescripter.ts";


@RegisterClass("NVPlayerCharacter")
export class NVPlayerCharacter extends NVActor {

    private static Camera : NVCamera = new NVCamera();

    static GetCamera() : NVCamera {
        return this.Camera;
    }


    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);
        console.log("PLAYER TICK")
    }


}