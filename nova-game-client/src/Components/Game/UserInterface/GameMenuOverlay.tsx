import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {CursorState, GameMode, PlayerStatics, UIState} from "../../../Three/Utility/PlayerGlobals";

//Shown on player death or a voluntary pause ('P' during gameplay) - see
//NVPlayerCharacter.PlayerDeath/Pause, the single entry points for each. The world is left
//exactly as it was at the moment this opened until a button here actually decides what happens
//next.
export const GameMenuOverlay = () => {

    const [reason, setReason] = useState<'died' | 'paused' | null>(null);

    useEffect(() => {
        const offOpen = GameEvents.On('gameMenuOpened', ({reason}) => {
            setReason(reason);

            //Same reasoning as LevelCompleteOverlay: free the OS cursor to click these buttons.
            CursorState.isCursorNeeded = true;
            UIState.isModalOpen = true;
            if (document.pointerLockElement) document.exitPointerLock();
        });

        const offResume = GameEvents.On('gameResumed', () => {
            setReason(null);
            CursorState.isCursorNeeded = false;
            UIState.isModalOpen = false;
            document.getElementById('canvas')?.requestPointerLock();
        });

        return () => {
            offOpen();
            offResume();
        };
    }, []);

    //Shared cleanup only - CursorState is left to each button, since Return to Editor already
    //sets it correctly itself (via ReturnToEditor) and shouldn't have that undone here.
    const dismissOverlay = () => {
        setReason(null);
        UIState.isModalOpen = false;
    };

    const retry = () => {
        PlayerStatics.PlayerCharacter?.PlayerRetry();
        dismissOverlay();
        CursorState.isCursorNeeded = false;
        document.getElementById('canvas')?.requestPointerLock();
    };

    const returnToEditor = () => {
        PlayerStatics.PlayerController?.ReturnToEditor();
        dismissOverlay();
    };

    //TODO Point this at a real menu screen once one exists - reload is the closest stand-in for
    //"start over" available today.
    const returnToMenu = () => {
        window.location.reload();
    };

    if (!reason) return null;

    return <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-slate-950/95">
        <div className="text-5xl font-bold text-orange-500">{reason === 'died' ? "You Died" : "Paused"}</div>
        <button
            className="border border-orange-500/40 bg-slate-900 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
            onClick={retry}
        >
            Retry
        </button>
        {GameMode.appMode === "createLevel" && (
            <button
                className="border border-orange-500/40 bg-slate-900 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={returnToEditor}
            >
                Return to Editor
            </button>
        )}
        <button
            className="mt-4 border border-orange-500/40 bg-slate-900 px-6 py-3 rounded-xl text-lg text-orange-500/70 cursor-pointer"
            onClick={returnToMenu}
        >
            Return to Menu
        </button>
    </div>;
};
