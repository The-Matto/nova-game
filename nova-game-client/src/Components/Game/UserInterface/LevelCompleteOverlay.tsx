import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {CursorState} from "../../../Three/Utility/PlayerGlobals";
import {PlayInEditor} from "../../../Three/Editor/PlayInEditor";

//Shown when the player reaches the goal volume with all objectives complete. Also surfaces a
//brief hint when they reach it too early, once levels actually have objectives to block on.
export const LevelCompleteOverlay = () => {

    const [isComplete, setIsComplete] = useState(false);
    const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

    useEffect(() => {
        const offComplete = GameEvents.On('levelComplete', () => {
            setIsComplete(true);

            //Release pointer lock so the real OS cursor is free to click "Play Again" - same
            //approach as editor mode. Canvas.tsx's pointerlockchange handler keeps the game loop
            //running through this via CursorState, rather than freezing on "unfocused".
            CursorState.isCursorNeeded = true;
            if (document.pointerLockElement) document.exitPointerLock();
        });

        const offBlocked = GameEvents.On('goalBlocked', ({remaining}) => {
            setBlockedMessage(`Still to do: ${remaining.join(', ')}`);
        });

        return () => {
            offComplete();
            offBlocked();
        };
    }, []);

    //Clear the "blocked" hint a few seconds after it's shown, rather than leaving it stuck.
    useEffect(() => {
        if (!blockedMessage) return;
        const timeout = setTimeout(() => setBlockedMessage(null), 3000);
        return () => clearTimeout(timeout);
    }, [blockedMessage]);

    const playAgain = () => {
        PlayInEditor.RestartPlaying();
        setIsComplete(false);
        setBlockedMessage(null);

        //Hand control back to normal FPS look.
        CursorState.isCursorNeeded = false;
        document.getElementById('canvas')?.requestPointerLock();
    };

    if (isComplete) {
        return <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-slate-950/80">
            <div className="text-5xl font-bold text-orange-500">Level Complete!</div>
            <button
                className="bg-slate-900 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={playAgain}
            >
                Play Again
            </button>
        </div>;
    }

    if (blockedMessage) {
        return <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-slate-900 px-4 py-2 rounded-xl text-lg text-orange-500">
            {blockedMessage}
        </div>;
    }

    return null;
};
