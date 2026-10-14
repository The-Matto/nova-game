import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {CursorState, GameMode, LevelSelection, PlayerStatics, UIState} from "../../../Three/Utility/PlayerGlobals";
import {PlayInEditor} from "../../../Three/Editor/PlayInEditor";
import {FormatLevelTime, LevelTimer} from "../../../Three/Utility/LevelTimer";
import {EnsureRegistered} from "../../../Three/Utility/PlayerIdentity";
import {GetRunHistory, RecordRun} from "../../../Three/Utility/RunHistory";
import {ConfettiBurst} from "./ConfettiBurst";
import {LeaderboardPanel} from "./LeaderboardPanel";
import {LevelRatingWidget} from "./LevelRatingWidget";
import {RunHistoryPanel} from "./RunHistoryPanel";
import type {LeaderboardResponse} from "nova-shared/leaderboard";

//Shown when the player reaches the goal volume with all objectives complete.
export const LevelCompleteOverlay = () => {

    const [isComplete, setIsComplete] = useState(false);
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
    const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
    const [runHistory, setRunHistory] = useState<number[]>([]);
    const [isNewPB, setIsNewPB] = useState(false);

    useEffect(() => {
        return GameEvents.On('levelComplete', () => {
            setIsComplete(true);

            //Release pointer lock so the OS cursor can click "Play Again" - same as editor mode.
            //Canvas.tsx's pointerlockchange handler keeps the game loop running via CursorState.
            CursorState.isCursorNeeded = true;
            UIState.isModalOpen = true;
            if (document.pointerLockElement) document.exitPointerLock();

            const levelId = LevelSelection.selectedLevelId;

            //Local-only, not PIE testing - a level being edited isn't necessarily even uploaded
            //yet (LevelSelection.selectedLevelId is still whatever the default/last-loaded value
            //is), so submitting/fetching a real leaderboard here could hit an unrelated level's
            //entries on the actual server, or one that doesn't exist at all. Same gating as
            //LevelRatingWidget/RunHistoryPanel below.
            if (GameMode.appMode !== "createLevel") {
                setIsNewPB(RecordRun(levelId, LevelTimer.elapsedTime));
                setRunHistory(GetRunHistory(levelId));

                //Submit first, then re-fetch, so the just-finished run is guaranteed to be in the
                //list LeaderboardPanel renders instead of racing a GET fired at the same time.
                EnsureRegistered()
                    .then(playerId => fetch('/api/leaderboard', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({levelId, playerId, timeSeconds: LevelTimer.elapsedTime}),
                    }).then(() => playerId))
                    .then(playerId => fetch(`/api/leaderboard?levelId=${encodeURIComponent(levelId)}&playerId=${encodeURIComponent(playerId)}`))
                    .then(res => {
                        if (!res.ok) throw new Error(`Server responded ${res.status}`);
                        return res.json();
                    })
                    .then(setLeaderboard)
                    .catch(() => setLeaderboardError("Couldn't reach the leaderboard server"));
            }
        });
    }, []);

    const retry = () => {
        PlayInEditor.RestartPlaying();
        setIsComplete(false);
        setLeaderboard(null);
        setLeaderboardError(null);
        setRunHistory([]);
        setIsNewPB(false);

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

    //A full reload rather than an in-app transition, but MainMenu is what App.tsx renders first
    //either way, so this does land back on the real menu now.
    const returnToMenu = () => {
        window.location.reload();
    };

    if (isComplete) {
        return <div className="nv-backdrop absolute inset-0 z-30 flex items-center justify-center gap-6">
            {isNewPB && <ConfettiBurst />}

            {/* Explicitly positioned/z-indexed, not just DOM order - LeaderboardPanel/
            RunHistoryPanel are plain non-positioned divs, which paint below ConfettiBurst's
            `fixed` layer regardless of source order unless raised like this. Stacked vertically
            as one group rather than side by side. */}
            {GameMode.appMode !== "createLevel" && (
                <div className="relative z-10 flex flex-col gap-6">
                    <LeaderboardPanel data={leaderboard} error={leaderboardError} />
                    <RunHistoryPanel attempts={runHistory} />
                </div>
            )}

            <div className="nv-panel relative z-10 flex flex-col items-center gap-5 px-12 pt-0 pb-9">
                <div className="nv-hazard self-stretch -mx-12" />
                <div className="flex flex-col items-center gap-1 mt-4">
                    <div className="nv-label">Final Time</div>
                    <div className="font-mono font-bold text-6xl text-ember tabular-nums">
                        {FormatLevelTime(LevelTimer.elapsedTime)}
                    </div>
                    {isNewPB && <div className="nv-chip nv-chip-hot mt-1">New Personal Best</div>}
                </div>
                <div className="nv-title text-6xl">Level Complete</div>
                {GameMode.appMode !== "createLevel" && (
                    <LevelRatingWidget levelId={LevelSelection.selectedLevelId} />
                )}
                <div className="flex gap-3">
                    <button className="nv-btn nv-btn-go nv-btn-lg" onClick={retry}>
                        Retry
                    </button>
                    {GameMode.appMode === "createLevel" && (
                        <button className="nv-btn nv-btn-lg" onClick={returnToEditor}>
                            Return to Editor
                        </button>
                    )}
                </div>
                <button className="nv-btn nv-btn-ghost" onClick={returnToMenu}>
                    ← Return to Menu
                </button>
            </div>
        </div>;
    }

    return null;
};
