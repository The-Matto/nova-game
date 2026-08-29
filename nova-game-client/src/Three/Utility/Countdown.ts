import {PlayerStatics} from "./PlayerGlobals";
import {ResetLevelTimer} from "./LevelTimer";

const COUNTDOWN_SECONDS = 3;

export const Countdown = {
    isActive: false,
    secondsRemaining: COUNTDOWN_SECONDS,
};

//Call whenever the player (re)spawns into a fresh run - same moments that used to call
//ResetLevelTimer() directly (PlayInEditor.StartPlaying, NVPlayerCharacter.PlayerRetry). Freezes
//the player (see NVPlayerPhysics.isCountingDown) and holds off the level timer until it's done.
export function StartCountdown() {
    Countdown.isActive = true;
    Countdown.secondsRemaining = COUNTDOWN_SECONDS;

    const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
    if (physics) physics.isCountingDown = true;
}

//Ticked every frame from Game.ts. Pausing holds the countdown in place rather than letting it
//run out in the background behind the menu.
export function TickCountdown(deltaTime : number) {
    if (!Countdown.isActive) return;

    const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
    if (physics?.isPaused) return;

    Countdown.secondsRemaining -= deltaTime;
    if (Countdown.secondsRemaining <= 0) {
        Countdown.isActive = false;
        if (physics) physics.isCountingDown = false;
        ResetLevelTimer();
    }
}
