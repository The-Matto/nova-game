import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {CursorState, UIState} from "../../../Three/Utility/PlayerGlobals";
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

    const playAgain = () => {
        PlayInEditor.RestartPlaying();
        setIsComplete(false);

        //Hand control back to normal FPS look.
        CursorState.isCursorNeeded = false;
        UIState.isModalOpen = false;
        document.getElementById('canvas')?.requestPointerLock();
    };

    if (isComplete) {
        return <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-slate-950/95">
            <div className="text-5xl font-bold text-orange-500">Level Complete!</div>
            <button
                className="border border-orange-500/40 bg-slate-900 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={playAgain}
            >
                Play Again
            </button>
        </div>;
    }

    return null;
};
