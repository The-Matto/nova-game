import {useState} from "react";
import type {LeaderboardEntry} from "nova-shared/leaderboard";
import {FormatLevelTime} from "../../../Three/Utility/LevelTimer";
import {PlayerIdentity} from "../../../Three/Utility/PlayerIdentity";
import {ProfileViewer} from "./ProfileViewer";

//One ranked row, shared by the post-game panel and the level browser's preview - the local
//player's own row always renders in ember, everyone else in bone. The name opens that
//player's profile, local player included.
export const LeaderboardRow = ({rank, entry} : {rank : number, entry : LeaderboardEntry}) => {
    const [showProfile, setShowProfile] = useState(false);
    const isLocalPlayer = entry.playerId === PlayerIdentity.id;

    const rankColor = isLocalPlayer || rank === 1 ? "text-ember" : rank <= 3 ? "text-bone" : "text-ash";

    return <div className={`flex items-center gap-3 text-sm px-2 py-1 border-l-2 ${isLocalPlayer ? "bg-ember/10 border-ember" : "border-transparent"}`}>
        {showProfile && <ProfileViewer playerId={entry.playerId} onClose={() => setShowProfile(false)} />}
        <div className={`w-7 font-mono text-xs ${rankColor}`}>{String(rank).padStart(2, "0")}</div>
        <button
            className={`flex-1 min-w-0 truncate text-left font-semibold cursor-pointer hover:text-molten ${isLocalPlayer ? "text-ember" : "text-bone"}`}
            onClick={() => setShowProfile(true)}
        >
            {entry.playerName}
        </button>
        <div className={`font-mono tabular-nums ${isLocalPlayer ? "text-ember" : "text-bone"}`}>{FormatLevelTime(entry.timeSeconds)}</div>
    </div>;
};
