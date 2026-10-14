import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {CursorState, GameMode, PlayerStatics, UIState} from "../../../Three/Utility/PlayerGlobals";
import {OptionsMenu} from "./OptionsMenu";
import {AccountSection} from "./AccountSection";

//Shown on player death or a voluntary pause ('P' during gameplay) - see
//NVPlayerCharacter.PlayerDeath/Pause. The world stays exactly as it was until a button here decides.
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

    //Escape already opens this (losing pointer lock force-pauses, see Canvas.tsx). This is the
    //other half: pressing it again while paused resumes - not available on 'died', like 'P'.
    useEffect(() => {
        if (reason !== 'paused') return;
        const onKeyDown = (e : KeyboardEvent) => {
            if (e.code !== 'Escape') return;
            PlayerStatics.PlayerCharacter?.Resume();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [reason]);

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

    //A full reload rather than an in-app transition, but MainMenu is what App.tsx renders first
    //either way, so this does land back on the real menu now.
    const returnToMenu = () => {
        window.location.reload();
    };

    if (!reason) return null;
    if (showOptions) return <OptionsMenu onBack={() => setShowOptions(false)} />;

    const isDead = reason === 'died';
    const items = [
        ...(reason === 'paused' ? [{label: "Resume", onClick: () => PlayerStatics.PlayerCharacter?.Resume()}] : []),
        {label: "Retry", onClick: retry},
        {label: "Options", onClick: () => setShowOptions(true)},
        ...(GameMode.appMode === "createLevel" ? [{label: "Return to Editor", onClick: returnToEditor}] : []),
    ];

    return <div className="nv-backdrop absolute inset-0 z-30 flex items-center justify-center">
        <AccountSection />
        {isDead && (
            <div className="absolute inset-0 pointer-events-none" style={{
                background: "radial-gradient(circle, transparent 30%, rgba(255,40,72,0.75) 100%)",
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
        <div className="nv-panel relative flex flex-col gap-6 pl-6 pr-12 py-9 w-[26rem]">
            <div className="px-4">
                <div className="nv-label">{isDead ? "Run terminated" : "Run on hold"}</div>
                <div className={`nv-title text-7xl ${isDead ? "text-blood" : ""}`}>{isDead ? "You Died" : "Paused"}</div>
            </div>
            <div className="flex flex-col">
                {items.map((item, i) => (
                    <button key={item.label} className="nv-menu-item nv-menu-item-sm" onClick={item.onClick}>
                        <span className="nv-menu-index">0{i + 1}</span>{item.label}
                    </button>
                ))}
            </div>
            <button className="nv-btn nv-btn-ghost self-start" onClick={returnToMenu}>
                ← Return to Menu
            </button>
        </div>
    </div>;
};
