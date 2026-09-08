import type {LevelSummary} from "./level-listing";

//One row in a profile's personal-bests list - same idea as LeaderboardEntry, but one row per
//level this player has ever played (their best time on each), not one level's top N players.
export interface PersonalBest {
    levelId : string;
    levelName : string;
    timeSeconds : number;
}

//Response of GET /api/players/profile?playerId=X - public, viewable for any player id.
export interface PlayerProfile {
    id : string;
    displayName : string;
    levels : LevelSummary[];
    personalBests : PersonalBest[];
    //null once permanently claimed (a real login linked) - an ISO date otherwise, when this
    //account will be deleted if never claimed (see CleanupAnonymousUsers.ts).
    deletionAt : string | null;
}

//Body of a PATCH /api/auth/me - renames the currently signed-in session's own account. There's
//no equivalent for anonymous players (no session to prove ownership - see AuthApi.ts).
export interface RenameRequest {
    displayName : string;
}
