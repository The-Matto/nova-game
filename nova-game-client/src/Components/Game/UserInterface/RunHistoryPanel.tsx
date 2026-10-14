import {FormatLevelTime} from "../../../Three/Utility/LevelTimer";

//Shown alongside the Level Complete screen, next to LeaderboardPanel - this browser's own recent
//non-PB attempts on the level (see RunHistory.ts), purely local, no server round trip.
export const RunHistoryPanel = ({attempts} : {attempts : number[]}) => {
    return <div className="nv-panel flex flex-col gap-3 px-7 py-6 w-80">
        <div className="nv-title text-3xl">Recent Attempts</div>
        {attempts.length === 0
            ? <div className="text-ash text-sm">No previous attempts yet.</div>
            : <div className="flex flex-col gap-1">
                {attempts.map((time, i) => (
                    <div key={i} className="flex items-center gap-3 text-bone text-sm border-b border-ink-700 pb-1">
                        <span className="font-mono text-ash w-6">{String(i + 1).padStart(2, "0")}</span>
                        <span className="font-mono tabular-nums">{FormatLevelTime(time)}</span>
                    </div>
                ))}
            </div>}
    </div>;
};
