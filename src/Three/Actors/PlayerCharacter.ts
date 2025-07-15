import  {NVActor} from "../Actor.ts";
import {NVCamera} from "../Camera.ts";



export class NVPlayerCharacter extends NVActor {

    private static Camera : NVCamera = new NVCamera();

    static GetCamera() : NVCamera {
        return this.Camera;
    }




}