import {InputInfo, keyActions, mousePosition} from "../../InputMaps.ts";
import type {NVPlayerCharacter} from "./PlayerCharacter.ts";
import {Vector2} from "three";
import {CursorState, EditorState, PlayerStatics} from "../Utility/PlayerGlobals";
import {EditorSelection} from "../Editor/EditorSelection.ts";

export type MoveDirection = "Forward" | "Right" | "Up";



export class PlayerController {

    controlledCharacter : NVPlayerCharacter;

    //Unreal-style editor camera controls: the real OS cursor is free to click/drag things
    //(gizmos, UI) except while the right mouse button is held, during which it looks around
    //instead. Toggled with 'P'. Editor-mode-ness itself lives in the global EditorState, not
    //here, so other systems can check it directly.
    private isRightMouseDown : boolean = false;

    constructor(controlledCharacter : NVPlayerCharacter) {
        this.BindInputEvents();
        console.log("BIND INPUT")
        this.controlledCharacter = controlledCharacter;
        PlayerStatics.PlayerController = this;
    }

    private BindInputEvents(){
        console.log(keyActions)
        //Axis values here are just direction (1 / -1) — actual speed and framerate scaling
        //happen in NVPlayerPhysics, not here.
        keyActions["KeyW"] = {
            startFunc: () => this.MoveForward(1),
            endFunc: () => {},
            isActive: false
        };
        keyActions["KeyS"] = {
            startFunc: () => this.MoveForward(-1),
            endFunc: () => {},
            isActive: false
        };

        keyActions["KeyD"] = {
            startFunc: () => this.MoveRight(1),
            endFunc: () => {},
            isActive: false
        };
        keyActions["KeyA"] = {
            startFunc: () => this.MoveRight(-1),
            endFunc: () => {},
            isActive: false
        };

        //Flycam up/down - only meaningful while free-flying (NVPlayerPhysics ignores
        //wishDirection.y otherwise), same as Space/Crouch's free-fly ascend/descend.
        keyActions["KeyE"] = {
            startFunc: () => this.MoveUp(1),
            endFunc: () => {},
            isActive: false
        };
        keyActions["KeyQ"] = {
            startFunc: () => this.MoveUp(-1),
            endFunc: () => {},
            isActive: false
        };

        keyActions["Space"] = {
            //Deliberately called every frame held, not just on press - free-fly ascend needs to
            //rise continuously while held. NVPlayerPhysics.TryJump() is what stops a held Space
            //from stacking multiple jump impulses into one jump.
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
        keyActions["KeyP"] = {
            //TODO Temporary keybind - this'll move to a menu option later.
            startFunc: () => {
                if (!keyActions["KeyP"].isEcho){
                    this.ToggleEditorMode();
                    keyActions["KeyP"].isEcho = true;
                }
            },
            endFunc: () => { keyActions["KeyP"].isEcho = false; },
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

            //In editor mode the real OS cursor moves itself, so mouse movement should only
            //drive the camera while actively looking (RMB held); outside it, it always looks.
            const shouldLook = !EditorState.isInEditor || this.isRightMouseDown;
            if (shouldLook) {
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
    private MoveUp = (axisValue : number)=>{
        if (this.controlledCharacter != undefined){
            this.controlledCharacter.AddMovementInput("Up", axisValue)
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

    //Editor-mode-only for now: left click picks whatever actor is under the real cursor (see
    //EditorSelection). Normal gameplay has nothing that needs left-click yet - UI buttons are
    //real DOM elements with their own onClick now, they don't route through here.
    public HandleMouseClick =  (pressedButton : number, clientX : number, clientY : number) => {

        if (pressedButton !== 0) return;
        if (!EditorState.isInEditor) return;

        //A click that landed on a gizmo handle is TransformControls' to handle (starting a
        //drag), not a new selection attempt - see EditorSelection.IsDragging.
        if (!this.isRightMouseDown && !EditorSelection.IsDragging()) {
            EditorSelection.TryPickAtScreenPoint(clientX, clientY);
        }
    }

    public SetRightMouseDown = (isDown : boolean) => {
        this.isRightMouseDown = isDown;
    }

    private ToggleEditorMode = () => {
        EditorState.isInEditor = !EditorState.isInEditor;
        CursorState.isCursorNeeded = EditorState.isInEditor;

        if (EditorState.isInEditor) {
            //Entering: release pointer lock so the real OS cursor is free to click/drag things
            //precisely (gizmos need real, accurate screen coordinates - see EditorSelection).
            //Canvas.tsx's pointerlockchange handler keeps gameHasFocus true through this even
            //though the pointer is no longer locked.
            this.isRightMouseDown = false;
            if (document.pointerLockElement) document.exitPointerLock();
        } else {
            //Exiting: drop whatever was selected and re-engage pointer lock for the immersive
            //gameplay feel.
            EditorSelection.ClearSelection();
            document.getElementById('canvas')?.requestPointerLock();
        }

        //Free-fly is a movement concept physics owns for itself; editor mode just happens to
        //drive it right now. Kept separate so e.g. a future spectator mode could use free-fly
        //without being "in the editor".
        if (this.controlledCharacter != undefined) {
            this.controlledCharacter.GetPhysicsComp().isFreeFlying = EditorState.isInEditor;
        }
    }

}