import {useState} from "react";
import type {LeaderboardEntry} from "nova-shared/leaderboard";
import {FormatLevelTime} from "../../../Three/Utility/LevelTimer";
import {PlayerIdentity} from "../../../Three/Utility/PlayerIdentity";
import {ProfileViewer} from "./ProfileViewer";

//One ranked row, shared by the post-game panel and the level browser's preview - the local
//player's own row always renders in amber, everyone else in white/orange. The name opens that
//player's profile, local player included.
export const LeaderboardRow = ({rank, entry} : {rank : number, entry : LeaderboardEntry}) => {
    const [showProfile, setShowProfile] = useState(false);
    const isLocalPlayer = entry.playerId === PlayerIdentity.id;

    return <div className={`flex items-center gap-3 text-sm px-2 py-1 rounded-lg ${isLocalPlayer ? "bg-amber-400/10" : ""}`}>
        {showProfile && <ProfileViewer playerId={entry.playerId} onClose={() => setShowProfile(false)} />}
        <div className={`w-6 ${isLocalPlayer ? "text-amber-400" : "text-white/50"}`}>{rank}</div>
        <button
            className={`flex-1 min-w-0 truncate text-left font-semibold underline cursor-pointer ${isLocalPlayer ? "text-amber-400" : "text-white"}`}
            onClick={() => setShowProfile(true)}
        >
            {entry.playerName}
        </button>
        <div className={`font-mono ${isLocalPlayer ? "text-amber-400" : "text-orange-400"}`}>{FormatLevelTime(entry.timeSeconds)}</div>
    </div>;
};
