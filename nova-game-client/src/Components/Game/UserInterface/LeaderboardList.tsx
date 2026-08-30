import type {LeaderboardResponse} from "nova-shared/leaderboard";
import {LeaderboardRow} from "./LeaderboardRow";

//Renders a fetched LeaderboardResponse - the top ranks, then a divider and the local player's
//own row if their best time didn't place inside `top` (see LeaderboardRow for the highlight).
export const LeaderboardList = ({data, error} : {
    data : LeaderboardResponse | null,
    error : string | null,
}) => {
    if (error) return <div className="text-red-400 text-sm">{error}</div>;
    if (!data) return <div className="text-white/50 text-sm">Loading…</div>;
    if (data.top.length === 0 && !data.outsideTop) return <div className="text-white/50 text-sm">No times yet.</div>;

    return <div className="flex flex-col gap-1">
        {data.top.map((entry, i) => <LeaderboardRow key={entry.id} rank={i + 1} entry={entry} />)}
        {data.outsideTop && <>
            <div className="border-t border-white/10 my-1" />
            <LeaderboardRow rank={data.outsideTop.rank} entry={data.outsideTop.entry} />
        </>}
    </div>;
};
