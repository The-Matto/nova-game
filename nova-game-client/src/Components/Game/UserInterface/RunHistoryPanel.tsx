import {FormatLevelTime} from "../../../Three/Utility/LevelTimer";

//Shown alongside the Level Complete screen, next to LeaderboardPanel - this browser's own recent
//non-PB attempts on the level (see RunHistory.ts), purely local, no server round trip.
export const RunHistoryPanel = ({attempts} : {attempts : number[]}) => {
    return <div className="flex flex-col gap-3 border border-orange-500/40 rounded-2xl bg-slate-900 px-8 py-8 w-72">
        <div className="text-2xl font-bold text-orange-500">Recent Attempts</div>
        {attempts.length === 0
            ? <div className="text-white/50 text-sm">No previous attempts yet.</div>
            : <div className="flex flex-col gap-1">
                {attempts.map((time, i) => (
                    <div key={i} className="flex items-center gap-3 text-white text-sm">
                        <span className="text-white/40 w-4">{i + 1}.</span>
                        <span className="font-mono">{FormatLevelTime(time)}</span>
                    </div>
                ))}
            </div>}
    </div>;
};
