
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

export type AppMode = "play" | "createLevel";

//Top-level flow the game is in. TODO Wire up to a real menu; hardcoded for now.
export const GameMode = {
    appMode: "createLevel" as AppMode,
};

//True while the player is in editor mode (free-fly, no-clip, RMB-to-look). Defaults from
//GameMode since UI reads this as React initial state before PlayInEditor.Initialize runs.
export const EditorState = {
    isInEditor: GameMode.appMode === "createLevel",
};

//True whenever the OS cursor is needed and pointer lock is deliberately released - editor mode
//or a modal like the level-complete screen (see Canvas.tsx's pointerlockchange handling).
export const CursorState = {
    isCursorNeeded: GameMode.appMode === "createLevel",
};


interface IPlayerStatics {
    PlayerController?: PlayerController;
    PlayerCharacter?:  NVPlayerCharacter;
    //NetDriver
}

export const PlayerStatics : IPlayerStatics = {};
