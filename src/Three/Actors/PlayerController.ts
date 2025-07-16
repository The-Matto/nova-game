import {InputInfo, keyActions, mousePosition} from "../../InputMaps.ts";
import type {NVPlayerCharacter} from "./PlayerCharacter.ts";
import {Vector2} from "three";


export type MoveDirection = "Forward" | "Right";



export class PlayerController {

    controlledCharacter : NVPlayerCharacter;

    constructor(controlledCharacter : NVPlayerCharacter) {
        this.BindInputEvents();
        console.log("BIND INPUT")
        this.controlledCharacter = controlledCharacter;
    }

    private BindInputEvents(){
        console.log(keyActions)
        keyActions["KeyW"] = {
            func: () => this.MoveForward(.01),
            isActive: false
        };
        keyActions["KeyS"] = {
            func: () => this.MoveForward(-.01),
            isActive: false
        };

        keyActions["KeyD"] = {
            func: () => this.MoveRight(.01),
            isActive: false
        };
        keyActions["KeyA"] = {
            func: () => this.MoveRight(-.01),
            isActive: false
        };
    }


    //Called on Tick() from owning player
    public ProcessInput(){

        //Check game is focused before processing input
        if (!InputInfo.gameHasFocus) return;

        //Handle keyboard input
        for (const value in keyActions){
            const action = keyActions[value];
             if (action.isActive){
                action.func();
             }
        }
        //Handle mouse input
        if (mousePosition.x != 0 || mousePosition.y != 0){
            this.controlledCharacter.AddLookInput(new Vector2(mousePosition.x, mousePosition.y));

            //Zero out the input after being processed. TODO Find more elegant way to do this
            mousePosition.x = 0;
            mousePosition.y = 0;
        }

    };

    private MoveForward = (axisValue : number)=>{
        if (this.controlledCharacter != undefined){
           this.controlledCharacter.AddMovementInput("Forward", axisValue)
        }
    }
    private MoveRight = (axisValue : number)=>{
        if (this.controlledCharacter != undefined){
            this.controlledCharacter.AddMovementInput("Right", axisValue)
        }
    }

}