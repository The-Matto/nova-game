//One row in a level's leaderboard - see LeaderboardApi.ts (server) and LeaderboardPanel.tsx.
//playerName is denormalized in (joined server-side from users.display_name) for display -
//playerId is the actual identity/ranking key.
export interface LeaderboardEntry {
    id : string;
    levelId : string;
    playerId : string;
    playerName : string;
    timeSeconds : number;
    submittedAt : string;
}

//Body of a POST /api/leaderboard - the server fills in id/playerName/submittedAt. playerId comes
//from a prior POST /api/players (see PlayerIdentity.ts on the client).
export interface SubmitTimeRequest {
    levelId : string;
    playerId : string;
    timeSeconds : number;
}

//Response of GET /api/leaderboard - ranked by each player's own best time (so retries don't
//flood the top list with duplicates). outsideTop is only present when a `playerId` was passed
//and that player's best run didn't place inside `top`.
export interface LeaderboardResponse {
    top : LeaderboardEntry[];
    outsideTop? : {entry : LeaderboardEntry, rank : number};
}
