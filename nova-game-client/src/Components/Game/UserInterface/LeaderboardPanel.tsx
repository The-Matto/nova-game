import type {LeaderboardResponse} from "nova-shared/leaderboard";
import {LeaderboardList} from "./LeaderboardList";

//Shown alongside the Level Complete screen - LevelCompleteOverlay owns the fetch/submit so the
//just-finished run is guaranteed to appear in the list this renders, not raced against a
//separate GET of its own.
export const LeaderboardPanel = ({data, error} : {
    data : LeaderboardResponse | null,
    error : string | null,
}) => {
    return <div className="flex flex-col gap-3 border border-orange-500/40 rounded-2xl bg-slate-900 px-8 py-8 w-72">
        <div className="text-2xl font-bold text-orange-500">Leaderboard</div>
        <LeaderboardList data={data} error={error} />
    </div>;
};
