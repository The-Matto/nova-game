
import * as THREE from "three";
import {PlayerController} from "../Actors/PlayerController";
import {NVPlayerCharacter} from "../Actors/PlayerCharacter";
import type {LevelTag} from "nova-shared/level-tags";


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

    //0-100 - read live by PlaySound (Sound.ts) as a straight percentage multiplier, on top of
    //that module's own fixed GLOBAL_VOLUME_SCALE.
    soundVolume: 100,
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
//Also set by MainMenu's "Edit Level" (see EditingLevel below) so the editor opens that level
//instead of the default TestWorld.json - editor mode is otherwise unaware of this.
//selectedLevelId matches a LevelSummary.id (see LevelBrowser) - what LeaderboardPanel submits/
//fetches against, since the level's file path isn't a stable identifier on the backend.
export const LevelSelection = {
    selectedLevelPath: "/TestWorld.json",
    selectedLevelId: "test-world",
};

//Set by MainMenu's "Edit Level" (see LevelBrowser.tsx) when the editor was opened to edit an
//existing upload rather than start a fresh level - lets EditorWorldSettingsPanel's Upload button
//offer "Update" (overwrite this level) alongside "Upload as New". null for a fresh level, where
//Upload always creates a new one. Never explicitly reset - every path back to the main menu is a
//full page reload (see LevelCompleteOverlay/GameMenuOverlay's "Return to Menu"), which clears it
//along with everything else in memory.
export const EditingLevel = {
    id: null as string | null,
    name: null as string | null,
    tags: [] as LevelTag[],
    description: null as string | null,
};

const PENDING_LEVEL_STORAGE_KEY = 'nova-game:pending-level-selection';

//For jumping straight into a level from somewhere other than the level browser (e.g.
//ProfileViewer's Play buttons) while a game may already be mounted - same "reload to reset
//everything" approach as Return to Menu, but stashes which level to load first since a plain
//reload alone would just land back on the main menu. App.tsx consumes this on boot.
export function QueuePlayLevelAndReload(level : {id : string, path : string}) {
    try {
        sessionStorage.setItem(PENDING_LEVEL_STORAGE_KEY, JSON.stringify(level));
    } catch {
        //Ignore - falls through to a plain reload, landing on the menu instead.
    }
    window.location.reload();
}

export function ConsumePendingLevelSelection() : {id : string, path : string} | null {
    try {
        const raw = sessionStorage.getItem(PENDING_LEVEL_STORAGE_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(PENDING_LEVEL_STORAGE_KEY);
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

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

//Cheap stand-in for real audio attenuation (see SpikeActor/CannonActor) - linear falloff from
//maxVolume at distance 0 down to 0 at maxDistance, clamped. 0 (i.e. don't play at all) once
//beyond maxDistance, or if there's no player position to measure against yet.
export function GetDistanceVolume(position : THREE.Vector3, maxDistance : number, maxVolume : number = 1) : number {
    const playerPosition = PlayerStatics.PlayerCharacter?.scene.position;
    if (!playerPosition) return 0;

    const distance = playerPosition.distanceTo(position);
    return Math.max(0, 1 - distance / maxDistance) * maxVolume;
}
