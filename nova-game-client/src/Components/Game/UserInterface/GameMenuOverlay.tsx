import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {CursorState, GameMode, PlayerStatics, UIState} from "../../../Three/Utility/PlayerGlobals";
import {OptionsMenu} from "./OptionsMenu";

//Shown on player death or a voluntary pause ('P' during gameplay) - see
//NVPlayerCharacter.PlayerDeath/Pause, the single entry points for each. The world is left
//exactly as it was at the moment this opened until a button here actually decides what happens
//next.
export const GameMenuOverlay = () => {

    const [reason, setReason] = useState<'died' | 'paused' | null>(null);
    const [showOptions, setShowOptions] = useState(false);

    useEffect(() => {
        const offOpen = GameEvents.On('gameMenuOpened', ({reason}) => {
            setReason(reason);
            setShowOptions(false);

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
    if (showOptions) return <OptionsMenu onBack={() => setShowOptions(false)} />;

    return <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/25">
        {reason === 'died' && (
            <div className="absolute inset-0 pointer-events-none" style={{
                background: "radial-gradient(circle, transparent 30%, rgba(185,28,28,0.85) 100%)",
                animation: "death-vignette-grow 1.2s ease-out forwards",
            }}>
                <style>{`
                    @keyframes death-vignette-grow {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                `}</style>
            </div>
        )}
        <div className="flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-12 py-10">
            <div className="text-5xl font-bold text-orange-500">{reason === 'died' ? "You Died" : "Paused"}</div>
            <button
                className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={retry}
            >
                Retry
            </button>
            <button
                className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={() => setShowOptions(true)}
            >
                Options
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
};
