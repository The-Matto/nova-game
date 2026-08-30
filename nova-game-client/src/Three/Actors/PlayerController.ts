import {InputInfo, keyActions, mousePosition} from "../../InputMaps.ts";
import type {NVPawn} from "../Pawn.ts";
import {Vector2} from "three";
import {CursorState, EditorState, GameMode, PlayerStatics, UIState} from "../Utility/PlayerGlobals";
import {EditorSelection} from "../Editor/EditorSelection.ts";
import {GameEvents} from "../Utility/GameEvents.ts";
import {PlayInEditor} from "../Editor/PlayInEditor.ts";
import {NVScene} from "../NVScene.ts";
import {Countdown} from "../Utility/Countdown.ts";

export class PlayerController {

    //Whichever pawn currently has control - the editor pawn or the player character, never both.
    private possessedPawn : NVPawn | null = null;

    //Unreal-style editor camera: OS cursor is free to click/drag things except while RMB is
    //held, which looks around instead. Toggled with 'P'.
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
        //Axis values here are just direction (±1) - speed/framerate scaling is NVPlayerPhysics's
        //job. W/E also double as the gizmo's move/rotate mode in editor mode without RMB held.
        keyActions["KeyW"] = {
            startFunc: () => {
                if (EditorState.isInEditor && !this.isRightMouseDown) {
                    this.TrySetTransformMode('translate', "KeyW");
                } else {
                    this.MoveForward(1);
                }
            },
            endFunc: () => { keyActions["KeyW"].isEcho = false; },
            isActive: false,
            isEcho: false
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
        //wishDirection.y otherwise), same as Space's free-fly ascend.
        keyActions["KeyE"] = {
            startFunc: () => {
                if (EditorState.isInEditor && !this.isRightMouseDown) {
                    this.TrySetTransformMode('rotate', "KeyE");
                } else {
                    this.MoveUp(1);
                }
            },
            endFunc: () => { keyActions["KeyE"].isEcho = false; },
            isActive: false,
            isEcho: false
        };
        keyActions["KeyQ"] = {
            startFunc: () => this.MoveUp(-1),
            endFunc: () => {},
            isActive: false
        };
        keyActions["KeyR"] = {
            startFunc: () => {
                if (EditorState.isInEditor && !this.isRightMouseDown) {
                    this.TrySetTransformMode('scale', "KeyR");
                }
            },
            endFunc: () => { keyActions["KeyR"].isEcho = false; },
            isActive: false,
            isEcho: false
        };

        keyActions["Space"] = {
            //Called every frame held, not just on press - free-fly ascend needs continuous rise.
            //TryJump() itself stops a held Space from stacking multiple impulses.
            startFunc: () => this.Jump(),
            endFunc: () => {},
            isActive: false
        };
        //Free-fly descend (see NVEditorPawn.Crouch) - a no-op in gameplay.
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

        keyActions["Delete"] = {
            //isEcho-guarded like KeyP - a one-shot action, not a repeat-while-held one.
            startFunc: () => {
                if (!keyActions["Delete"].isEcho){
                    this.DeleteSelectedActor();
                    keyActions["Delete"].isEcho = true;
                }
            },
            endFunc: () => { keyActions["Delete"].isEcho = false; },
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
            //drive the camera while actively looking (RMB held); outside it, it always looks -
            //except while a blocking modal (Level Complete, Player Death) is open, or during the
            //pre-run countdown.
            const shouldLook = !UIState.isModalOpen && !Countdown.isActive && (!EditorState.isInEditor || this.isRightMouseDown);
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

    //In editor mode, left click picks the actor under the cursor (EditorSelection) - Ctrl held
    //adds it to the selection instead of replacing it. Otherwise it's routed to the possessed
    //pawn as fire input - UI buttons have their own onClick, not this.
    public HandleMouseClick =  (pressedButton : number, clientX : number, clientY : number, isCtrlHeld : boolean = false) => {

        if (pressedButton !== 0) return;

        if (!EditorState.isInEditor) {
            if (!Countdown.isActive) this.possessedPawn?.Fire();
            return;
        }

        //A click that landed on a gizmo handle is TransformControls' to handle (starting a
        //drag), not a new selection attempt - see EditorSelection.IsDragging.
        if (!this.isRightMouseDown && !EditorSelection.IsDragging()) {
            EditorSelection.TryPickAtScreenPoint(clientX, clientY, isCtrlHeld);
        }
    }

    public SetRightMouseDown = (isDown : boolean) => {
        this.isRightMouseDown = isDown;
    }

    //isEcho-guarded like KeyP/Delete - switching mode is one-shot, not repeat-while-held.
    private TrySetTransformMode = (mode : 'translate' | 'rotate' | 'scale', keyCode : string) => {
        if (keyActions[keyCode].isEcho) return;
        EditorSelection.SetTransformMode(mode);
        keyActions[keyCode].isEcho = true;
    }

    //Editor-mode-only: deletes every currently-selected actor.
    private DeleteSelectedActor = () => {
        if (!EditorState.isInEditor) return;

        const actors = EditorSelection.GetSelectedActors();
        if (actors.length === 0) return;

        EditorSelection.ClearSelection();
        for (const actor of actors) NVScene.DestroyActor(actor);
    }

    //'P' - starts a fresh PIE session from editor mode; during gameplay it opens/closes the
    //pause menu instead of exiting straight to the editor (see ReturnToEditor for that). Pausing
    //itself isn't editor-only - only entering the editor is (see the appMode check below).
    public ToggleEditorMode = () => {
        if (EditorState.isInEditor) {
            if (GameMode.appMode !== "createLevel") return;
            this.EnterPlayMode();
            return;
        }

        const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
        if (!physics || physics.isDead) return; //Can't pause-toggle out of a real death.

        if (physics.isPaused) PlayerStatics.PlayerCharacter?.Resume();
        else PlayerStatics.PlayerCharacter?.Pause();
    }

    //Starts a fresh PIE session - called by 'P' from editor mode, and the palette's Play button.
    public EnterPlayMode = () => {
        if (GameMode.appMode !== "createLevel") return;

        EditorState.isInEditor = false;
        CursorState.isCursorNeeded = false;
        document.getElementById('canvas')?.requestPointerLock();
        PlayInEditor.StartPlaying();
        GameEvents.Emit('editorModeChanged', {isInEditor: false});
    }

    //Called by the game menu's "Return to Editor" button - the only way back to editor mode now.
    public ReturnToEditor = () => {
        if (GameMode.appMode !== "createLevel") return;

        this.isRightMouseDown = false;
        EditorState.isInEditor = true;
        CursorState.isCursorNeeded = true;
        if (document.pointerLockElement) document.exitPointerLock();
        PlayInEditor.StopPlaying();
        GameEvents.Emit('editorModeChanged', {isInEditor: true});
    }

}
