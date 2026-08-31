import {useEffect, useState} from "react";
import type {LeaderboardResponse} from "nova-shared/leaderboard";
import {EnsureRegistered} from "../../../Three/Utility/PlayerIdentity";
import {LeaderboardList} from "./LeaderboardList";

//Fetched only once a level's row is actually expanded (see LevelBrowser) - not eagerly for
//every row up front.
export const LevelLeaderboardPreview = ({levelId} : {levelId : string}) => {
    const [data, setData] = useState<LeaderboardResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        EnsureRegistered()
            .then(playerId => fetch(`/api/leaderboard?levelId=${encodeURIComponent(levelId)}&playerId=${encodeURIComponent(playerId)}`))
            .then(res => {
                if (!res.ok) throw new Error(`Server responded ${res.status}`);
                return res.json();
            })
            .then(setData)
            .catch(() => setError("Couldn't reach the leaderboard server"));
    }, [levelId]);

    return <div className="flex flex-col gap-2">
        <div className="text-lg font-bold text-orange-500">Top Times</div>
        <LeaderboardList data={data} error={error} />
    </div>;
};
