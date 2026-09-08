import {GetRedis} from "./Redis";

//Long enough that "this week" is never gone before it's stopped being interesting, short enough
//it doesn't accumulate forever - it's Redis-only, deliberately not durable (see LevelsApi.ts).
const TTL_SECONDS = 14 * 24 * 60 * 60;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

//Not a calendar week (Mon-Sun) - just an integer that ticks over every 7 days from the Unix
//epoch, so increment and read always agree on "this week" without any shared config. Good enough
//for "popular this week" - it doesn't need calendar precision.
function WeekBucket() : number {
    return Math.floor(Date.now() / WEEK_MS);
}

function RedisKey(levelId : string, week : number) : string {
    return `level-plays:${levelId}:${week}`;
}

//Best-effort - a Redis hiccup here just means this play doesn't count toward "popular this
//week," not a failed request. Called once per level-play, not per level-complete (see
//MainMenu.tsx/App.tsx) - a level being popular is about how often it's picked, not finished.
export async function RecordLevelPlay(levelId : string) : Promise<void> {
    try {
        const redis = GetRedis();
        const key = RedisKey(levelId, WeekBucket());
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, TTL_SECONDS);
    } catch {
        //Ignore - see comment above.
    }
}

//Empty map (not zeros) if Redis isn't usable right now - callers treat a missing id as 0 plays,
//same fail-open pattern as the leaderboard cache.
export async function GetWeeklyPlays(levelIds : string[]) : Promise<Map<string, number>> {
    if (levelIds.length === 0) return new Map();
    try {
        const redis = GetRedis();
        const week = WeekBucket();
        const values = await redis.mget(...levelIds.map(id => RedisKey(id, week)));
        return new Map(levelIds.map((id, i) => [id, Number(values[i]) || 0]));
    } catch {
        return new Map();
    }
}
