import {PlayerStatics} from "./PlayerGlobals";

export const LevelTimer = {
    elapsedTime: 0,
    isRunning: false,
};

//Call whenever the player (re)spawns into a fresh run - PlayInEditor.StartPlaying (Play button,
//Level Complete's Retry) and NVPlayerCharacter.PlayerRetry (death/pause menu's Retry).
export function ResetLevelTimer() {
    LevelTimer.elapsedTime = 0;
    LevelTimer.isRunning = true;
}

//Call on levelComplete, or when leaving play mode entirely - freezes the readout in place.
export function StopLevelTimer() {
    LevelTimer.isRunning = false;
}

//Ticked every frame from Game.ts. Skips accumulating while the pause/death menu has frozen the
//world (see NVPlayerPhysics.isPaused/isDead), so idle time in a menu doesn't count toward the run.
export function TickLevelTimer(deltaTime : number) {
    if (!LevelTimer.isRunning) return;

    const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
    if (physics?.isPaused || physics?.isDead) return;

    LevelTimer.elapsedTime += deltaTime;
}

export function FormatLevelTime(seconds : number) : string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centis = Math.floor((seconds % 1) * 100);
    return `${minutes}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
}
