import {keyActions} from "../../InputMaps.ts";


export class PlayerController {

    constructor() {
        this.BindInputEvents();
    }

    private BindInputEvents(){
        keyActions["KeyW"] = () => {
            this.MoveForward();
        };
    }




    private MoveForward = ()=>{
        console.log("MoveForward");
    }

}