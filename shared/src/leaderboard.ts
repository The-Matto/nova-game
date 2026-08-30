//One row in a level's leaderboard - see LeaderboardApi.ts (server) and LeaderboardPanel.tsx.
export interface LeaderboardEntry {
    id : string;
    levelId : string;
    playerName : string;
    timeSeconds : number;
    submittedAt : string;
}

//Body of a POST /api/leaderboard - the server fills in id/submittedAt.
export interface SubmitTimeRequest {
    levelId : string;
    playerName : string;
    timeSeconds : number;
}

//Response of GET /api/leaderboard - ranked by each player's own best time (so retries don't
//flood the top list with duplicates). outsideTop is only present when a `playerName` was passed
//and that player's best run didn't place inside `top`.
export interface LeaderboardResponse {
    top : LeaderboardEntry[];
    outsideTop? : {entry : LeaderboardEntry, rank : number};
}
