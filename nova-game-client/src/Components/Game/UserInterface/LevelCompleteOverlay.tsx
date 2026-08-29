import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {CursorState, GameMode, PlayerStatics, UIState} from "../../../Three/Utility/PlayerGlobals";
import {PlayInEditor} from "../../../Three/Editor/PlayInEditor";

//Shown when the player reaches the goal volume with all objectives complete.
export const LevelCompleteOverlay = () => {

    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        return GameEvents.On('levelComplete', () => {
            setIsComplete(true);

            //Release pointer lock so the OS cursor can click "Play Again" - same as editor mode.
            //Canvas.tsx's pointerlockchange handler keeps the game loop running via CursorState.
            CursorState.isCursorNeeded = true;
            UIState.isModalOpen = true;
            if (document.pointerLockElement) document.exitPointerLock();
        });
    }, []);

    const retry = () => {
        PlayInEditor.RestartPlaying();
        setIsComplete(false);

        //Hand control back to normal FPS look.
        CursorState.isCursorNeeded = false;
        UIState.isModalOpen = false;
        document.getElementById('canvas')?.requestPointerLock();
    };

    const returnToEditor = () => {
        PlayerStatics.PlayerController?.ReturnToEditor();
        setIsComplete(false);
        UIState.isModalOpen = false;
    };

    //TODO Point this at a real menu screen once one exists - reload is the closest stand-in for
    //"start over" available today.
    const returnToMenu = () => {
        window.location.reload();
    };

    if (isComplete) {
        return <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/25">
            <div className="flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-12 py-10">
                <div className="text-5xl font-bold text-orange-500">Level Complete!</div>
                <button
                    className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                    onClick={retry}
                >
                    Retry
                </button>
                {GameMode.appMode === "createLevel" && (
                    <button
                        className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                        onClick={returnToEditor}
                    >
                        Return to Editor
                    </button>
                )}
                <button
                    className="mt-4 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-lg text-orange-500/70 cursor-pointer"
                    onClick={returnToMenu}
                >
                    Return to Menu
                </button>
            </div>
        </div>;
    }

    return null;
};
