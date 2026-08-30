import type {LeaderboardEntry} from "nova-shared/leaderboard";
import {FormatLevelTime} from "../../../Three/Utility/LevelTimer";
import {PlayerIdentity} from "../../../Three/Utility/PlayerIdentity";

//One ranked row, shared by the post-game panel and the level browser's preview - the local
//player's own row always renders in amber, everyone else in white/orange.
export const LeaderboardRow = ({rank, entry} : {rank : number, entry : LeaderboardEntry}) => {
    const isLocalPlayer = entry.playerName === PlayerIdentity.name;
    return <div className={`flex items-center gap-3 text-sm px-2 py-1 rounded-lg ${isLocalPlayer ? "bg-amber-400/10" : ""}`}>
        <div className={`w-6 ${isLocalPlayer ? "text-amber-400" : "text-white/50"}`}>{rank}</div>
        <div className={`flex-1 truncate font-semibold ${isLocalPlayer ? "text-amber-400" : "text-white"}`}>{entry.playerName}</div>
        <div className={`font-mono ${isLocalPlayer ? "text-amber-400" : "text-orange-400"}`}>{FormatLevelTime(entry.timeSeconds)}</div>
    </div>;
};
