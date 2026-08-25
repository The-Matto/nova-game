import {InputInfo, keyActions, mousePosition} from "../../InputMaps.ts";
import type {NVPawn} from "../Pawn.ts";
import {Vector2} from "three";
import {CursorState, EditorState, GameMode, PlayerStatics} from "../Utility/PlayerGlobals";
import {EditorSelection} from "../Editor/EditorSelection.ts";
import {GameEvents} from "../Utility/GameEvents.ts";
import {PlayInEditor} from "../Editor/PlayInEditor.ts";

export class PlayerController {

    //Whichever pawn currently has control - the editor pawn or the player character, never both.
    private possessedPawn : NVPawn | null = null;

    //Unreal-style editor camera controls: the real OS cursor is free to click/drag things
    //(gizmos, UI) except while the right mouse button is held, during which it looks around
    //instead. Toggled with 'P'. Editor-mode-ness itself lives in the global EditorState, not
    //here, so other systems can check it directly.
    private isRightMouseDown : boolean = false;

    constructor() {
        this.BindInputEvents();
        PlayerStatics.PlayerController = this;
    }

    public Possess(pawn : NVPawn){
        this.possessedPawn = pawn;
    }

    public GetPossessedPawn() : NVPawn | null {
        return this.possessedPawn;
    }

    private BindInputEvents(){
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


    //Called on Tick() from the currently-possessed pawn
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
                this.possessedPawn?.AddLookInput(new Vector2(mousePosition.x, mousePosition.y));
            }

            //Zero out the input after being processed. TODO Find more elegant way to do this
            mousePosition.x = 0;
            mousePosition.y = 0;
        }

    };

    private MoveForward = (axisValue : number)=>{
        this.possessedPawn?.AddMovementInput("Forward", axisValue)
    }
    private MoveRight = (axisValue : number)=>{
        this.possessedPawn?.AddMovementInput("Right", axisValue)
    }
    private MoveUp = (axisValue : number)=>{
        this.possessedPawn?.AddMovementInput("Up", axisValue)
    }

    private Jump = ()=>{
        this.possessedPawn?.Jump()
    }
    private Crouch = (isStart : boolean)=>{
        this.possessedPawn?.Crouch(isStart)
    }

    private Sprint = (isStart : boolean)=>{
        this.possessedPawn?.Sprint(isStart)
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
        //PIE is a level-creator tool - no-op in plain "play" mode.
        if (GameMode.appMode !== "createLevel") return;

        EditorState.isInEditor = !EditorState.isInEditor;
        CursorState.isCursorNeeded = EditorState.isInEditor;

        if (EditorState.isInEditor) {
            this.isRightMouseDown = false;
            if (document.pointerLockElement) document.exitPointerLock();
            PlayInEditor.StopPlaying();
        } else {
            document.getElementById('canvas')?.requestPointerLock();
            PlayInEditor.StartPlaying();
        }

        GameEvents.Emit('editorModeChanged', {isInEditor: EditorState.isInEditor});
    }

}
