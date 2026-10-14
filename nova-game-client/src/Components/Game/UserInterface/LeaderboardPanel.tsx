import type {LeaderboardResponse} from "nova-shared/leaderboard";
import {LeaderboardList} from "./LeaderboardList";

//Shown alongside the Level Complete screen - LevelCompleteOverlay owns the fetch/submit so the
//just-finished run is guaranteed to appear in the list this renders, not raced against a
//separate GET of its own.
export const LeaderboardPanel = ({data, error} : {
    data : LeaderboardResponse | null,
    error : string | null,
}) => {
    return <div className="nv-panel flex flex-col gap-3 px-7 py-6 w-80">
        <div className="nv-title text-3xl">Leaderboard</div>
        <LeaderboardList data={data} error={error} />
    </div>;
};
