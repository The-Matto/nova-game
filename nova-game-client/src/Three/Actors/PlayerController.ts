import {InputInfo, keyActions, mousePosition, virtualCursorPosition} from "../../InputMaps.ts";
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
            startFunc: () => this.MoveForward(.01),
            endFunc: () => {},
            isActive: false
        };
        keyActions["KeyS"] = {
            startFunc: () => this.MoveForward(-.01),
            endFunc: () => {},
            isActive: false
        };

        keyActions["KeyD"] = {
            startFunc: () => this.MoveRight(.01),
            endFunc: () => {},
            isActive: false
        };
        keyActions["KeyA"] = {
            startFunc: () => this.MoveRight(-.01),
            endFunc: () => {},
            isActive: false
        };

        keyActions["Space"] = {
            startFunc: () => this.Jump(),
            endFunc: () => {},
            isActive: false
        };
        keyActions["ShiftLeft"] = {
            startFunc: () => this.Sprint(true),
            endFunc: () => this.Sprint(false),
            isActive: false
        };
        keyActions["KeyC"] = {
            startFunc: () => this.Crouch(true),
            endFunc: () => this.Crouch(false),
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
                action.startFunc();
             }
        }
        //Handle mouse input
        if (mousePosition.x != 0 || mousePosition.y != 0){
            //Virtual mouse cursor
            virtualCursorPosition.x += mousePosition.x;
            virtualCursorPosition.y += mousePosition.y;
            
            console.log(document.elementFromPoint(virtualCursorPosition.x, virtualCursorPosition.y));

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

    private Jump = ()=>{
        if (this.controlledCharacter != undefined){
            this.controlledCharacter.Jump()
        }
    }
    private Crouch = (isStart : boolean)=>{
        if (this.controlledCharacter != undefined){
            this.controlledCharacter.Crouch(isStart)
        }
    }

    private Sprint = (isStart : boolean)=>{
        if (this.controlledCharacter != undefined){
            this.controlledCharacter.Sprint(isStart)
        }
    }


}