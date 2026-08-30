
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

    //Max camera roll (degrees) while strafing - see NVWeapon.Tick.
    cameraTiltDegrees: 2.5,
}

const PLAYER_SETTINGS_STORAGE_KEY = 'nova-game:player-settings';

//Restores every PlayerSettings field saved by SavePlayerSettings() - a new setting round-trips
//for free, no extra wiring needed.
try {
    const saved : Record<string, unknown> = JSON.parse(localStorage.getItem(PLAYER_SETTINGS_STORAGE_KEY) ?? '{}');
    for (const key of Object.keys(PlayerSettings) as (keyof typeof PlayerSettings)[]) {
        if (typeof saved[key] === typeof PlayerSettings[key]) PlayerSettings[key] = saved[key] as number;
    }
} catch {
    //Ignore - just keep the defaults.
}

//Persists every current PlayerSettings value - call after changing one (see OptionsMenu).
export function SavePlayerSettings() {
    try {
        localStorage.setItem(PLAYER_SETTINGS_STORAGE_KEY, JSON.stringify(PlayerSettings));
    } catch {
        //Ignore - not critical if this fails.
    }
}

export const WindowSettings = {
    windowHeight: window.innerHeight,
    windowWidth: window.innerWidth,
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

//Which level NVScene's constructor loads - set by LevelBrowser before Play mounts the game.
//Editor mode never touches this, so it keeps loading the same TestWorld.json it always has.
export const LevelSelection = {
    selectedLevelPath: "/TestWorld.json",
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

//True while a blocking gameplay modal (Level Complete, Player Death) is open - distinct from
//CursorState, since editor mode also needs the cursor free but should keep taking camera input.
export const UIState = {
    isModalOpen: false,
};


interface IPlayerStatics {
    PlayerController?: PlayerController;
    PlayerCharacter?:  NVPlayerCharacter;
    //NetDriver
}

export const PlayerStatics : IPlayerStatics = {};

//True whenever the player is dead, paused, or still in the pre-run countdown - gameplay actors
//with their own Tick-driven behavior (hazards, projectiles) should check this too, not just
//NVPlayerPhysics itself, so the whole world actually stops while a menu's up.
export function IsGameplayFrozen() : boolean {
    const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
    return !!physics && (physics.isDead || physics.isPaused || physics.isCountingDown || physics.isLevelComplete);
}
