import {InputInfo, keyActions, mousePosition, virtualCursorPosition} from "../../InputMaps.ts";
import type {NVPlayerCharacter} from "./PlayerCharacter.ts";
import {Vector2} from "three";
import {PlayerStatics, WindowSettings} from "../Utility/PlayerGlobals";
import {MattoMath} from "../Utility/MathUtils";
import type {InteractiveElement} from "../../Components/Game/UserInterface/UI-Main";

export type MoveDirection = "Forward" | "Right";



export class PlayerController {

    controlledCharacter : NVPlayerCharacter;

    private showMouseCursor : boolean = false;

    constructor(controlledCharacter : NVPlayerCharacter) {
        this.BindInputEvents();
        console.log("BIND INPUT")
        this.controlledCharacter = controlledCharacter;
        PlayerStatics.PlayerController = this;
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
        keyActions["Backquote"] = {
            startFunc: () => {
                if (!keyActions["Backquote"].isEcho){
                    this.SetShowMouseCursor(!this.GetShowMouseCursor())

                    //Due to input being processed on tick() we cannot use native
                    //echo detection so crude impl
                    keyActions["Backquote"].isEcho = true;
                }
            },
            endFunc: () => { keyActions["Backquote"].isEcho = false;},
            isActive: false,
            isEcho: false
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
            if (this.showMouseCursor)
            {
                //TODO Clamp this to the bounds of the canvas
                virtualCursorPosition.x += mousePosition.x * 200;
                virtualCursorPosition.y += mousePosition.y* 200;

                virtualCursorPosition.x = MattoMath.Clamp(virtualCursorPosition.x, 0, WindowSettings.windowWidth);
                virtualCursorPosition.y = MattoMath.Clamp(virtualCursorPosition.y, 0, WindowSettings.windowHeight);

            }
            else
            {
                this.controlledCharacter.AddLookInput(new Vector2(mousePosition.x, mousePosition.y));
            }

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

    public HandleMouseClick =  (pressedButton : number) => {

        const element = document.getElementById('canvas') as HTMLElement;

        if (this.showMouseCursor && pressedButton === 0){
            //We are interacting with UI -- TODO We need to add the canvas offset!
            const rect = element.getBoundingClientRect();

            // Absolute position from the top-left of the document
            const canvasTop = rect.top + window.scrollY;
            const canvasLeft = rect.left + window.scrollX;

            //Get object under the virtual cursor
            const el = document.elementFromPoint(
                canvasLeft + virtualCursorPosition.x, canvasTop +virtualCursorPosition.y) as InteractiveElement;

            //Trigger the event on the element
            if (el && typeof el.remoteTrigger === 'function') {
                el.remoteTrigger();
            }
        }
    }

    public GetShowMouseCursor = () : boolean =>{ return this.showMouseCursor}

    public SetShowMouseCursor = (show : boolean)=>{
        this.showMouseCursor = show;

        //Reposition cursor to center screen
        if (show){
            virtualCursorPosition.x = WindowSettings.windowWidth / 2
            virtualCursorPosition.x = WindowSettings.windowHeight / 2

        }
    }


}