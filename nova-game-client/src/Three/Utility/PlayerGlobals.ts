
import {PlayerController} from "../Actors/PlayerController";
import {NVPlayerCharacter} from "../Actors/PlayerCharacter";


export const CameraSettings = {
    fov: 90,
    nearClip: 0.1,
    farClip: 1000,

};

export const PlayerSettings = {
    mouseSensitivityX: 5.0,
    mouseSensitivityY: 5.0,

    mouseSensitivityMenuX: 15.0,
    mouseSensitivityMenuY: 15.0,
}

export const WindowSettings = {
    windowHeight: 750,
    windowWidth: 1000,
    isPaused: false
};

export const GameStats = {
    fps: 60,
    deltaTime: 1.0
};

//True while the player is in editor mode (free-fly, no-clip, RMB-to-look - see
//PlayerController.ToggleEditorMode). This is the thing to check for "are we editing the level or
//playing it" - actors/systems should check this directly to gate editor-only or gameplay-only
//code (e.g. NVGoalVolume skipping its trigger while in editor), rather than inferring editor
//state from something like the player's free-fly movement flag, which is a separate concept that
//just happens to be driven by this right now.
export const EditorState = {
    isInEditor: false,
};

//True whenever some UI needs the real OS cursor and pointer lock is deliberately being kept
//released for it - editor mode, or a modal like the level-complete screen. Distinct from
//EditorState.isInEditor: that also drives gameplay semantics (free-fly, collision, the goal
//volume's trigger); this is purely "don't auto re-lock the pointer, and don't treat the game as
//unfocused just because it isn't locked" - see Canvas.tsx's pointerlockchange handling.
export const CursorState = {
    isCursorNeeded: false,
};


interface IPlayerStatics {
    PlayerController?: PlayerController;
    PlayerCharacter?:  NVPlayerCharacter;
    //Gamemode
    //NetDriver
}

export const PlayerStatics : IPlayerStatics = {};
