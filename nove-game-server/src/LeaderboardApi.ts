import type {IncomingMessage, ServerResponse} from "http";
import type {LeaderboardEntry, LeaderboardResponse, SubmitTimeRequest} from "nova-shared/leaderboard";
import {pool} from "./Db";
import {GetRedis} from "./Redis";
import {GetClientIp, IsRateLimited} from "./RateLimit";
import {ResolveEffectivePlayerId} from "./Session";
import {ReadBody} from "./Http";

const TOP_COUNT = 5;
//Generous - a real session can submit once per level attempt, and multiple players can share an
//IP (school/office NAT). Still low enough to block a flood script.
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;

function IsValidSubmission(value : any) : value is SubmitTimeRequest {
    return typeof value?.levelId === "string" && typeof value?.playerId === "string"
        && typeof value?.timeSeconds === "number" && Number.isFinite(value.timeSeconds) && value.timeSeconds > 0;
}

function RowToEntry(row : any) : LeaderboardEntry {
    return {
        id: String(row.id),
        levelId: row.level_id,
        playerId: row.player_id,
        playerName: row.display_name,
        timeSeconds: Number(row.time_seconds),
        submittedAt: row.submitted_at.toISOString(),
    };
}

function RedisKey(levelId : string) : string {
    return `leaderboard:${levelId}`;
}

//Ranked by each player's own best time, not raw attempts - retries would otherwise flood the
//list with duplicates. The full no-cache path; also used to warm Redis on a miss.
async function GetRankedEntriesFromPostgres(levelId : string) : Promise<LeaderboardEntry[]> {
    const result = await pool.query(`
        SELECT DISTINCT ON (le.player_id) le.id, le.level_id, le.player_id, le.time_seconds, le.submitted_at, u.display_name
        FROM leaderboard_entries le
        JOIN users u ON u.id = le.player_id
        WHERE le.level_id = $1
        ORDER BY le.player_id, le.time_seconds ASC
    `, [levelId]);

    return result.rows.map(RowToEntry).sort((a, b) => a.timeSeconds - b.timeSeconds);
}

//Redis only knows playerId+time (that's all a sorted set holds) - this fills in id/playerName/
//submittedAt for a specific handful of players, instead of re-scanning every entry on the level.
async function EnrichPlayerIds(levelId : string, playerIds : string[]) : Promise<Map<string, LeaderboardEntry>> {
    if (playerIds.length === 0) return new Map();
    const result = await pool.query(`
        SELECT DISTINCT ON (le.player_id) le.id, le.level_id, le.player_id, le.time_seconds, le.submitted_at, u.display_name
        FROM leaderboard_entries le
        JOIN users u ON u.id = le.player_id
        WHERE le.level_id = $1 AND le.player_id = ANY($2)
        ORDER BY le.player_id, le.time_seconds ASC
    `, [levelId, playerIds]);

    return new Map(result.rows.map(row => [row.player_id, RowToEntry(row)]));
}

//null return means "Redis isn't usable right now" (unconfigured or unreachable) - callers fall
//back to Postgres rather than erroring, same as R2's optional-subsystem pattern.
async function TryGetTopFromRedis(levelId : string) : Promise<string[] | null> {
    try {
        const redis = GetRedis();
        return await redis.zrange(RedisKey(levelId), 0, TOP_COUNT - 1, "WITHSCORES");
    } catch {
        return null;
    }
}

function PairsToPlayerIds(flatPairs : string[]) : string[] {
    const ids : string[] = [];
    for (let i = 0; i < flatPairs.length; i += 2) ids.push(flatPairs[i]);
    return ids;
}

//Fills Redis's sorted set from a full Postgres scan - used once per level, the first time its
//cache is empty (freshly provisioned Redis, or entries that predate Redis being wired up at all).
async function BackfillRedis(levelId : string, ranked : LeaderboardEntry[]) : Promise<void> {
    if (ranked.length === 0) return;
    const redis = GetRedis();
    const args = ranked.flatMap(e => [e.timeSeconds, e.playerId]);
    await redis.zadd(RedisKey(levelId), ...args);
}

async function GetTopEntries(levelId : string) : Promise<LeaderboardEntry[]> {
    const cached = await TryGetTopFromRedis(levelId);
    if (cached === null) return (await GetRankedEntriesFromPostgres(levelId)).slice(0, TOP_COUNT);

    if (cached.length === 0) {
        const ranked = await GetRankedEntriesFromPostgres(levelId);
        BackfillRedis(levelId, ranked).catch(() => {});
        return ranked.slice(0, TOP_COUNT);
    }

    const playerIds = PairsToPlayerIds(cached);
    const enriched = await EnrichPlayerIds(levelId, playerIds);
    return playerIds.map(id => enriched.get(id)).filter((e) : e is LeaderboardEntry => e !== undefined);
}

//Only called for a player outside the top list - finds their rank via ZRANK (falling back to a
//full Postgres scan), or null if they've never submitted for this level.
async function GetPlayerRank(levelId : string, playerId : string) : Promise<{rank : number, entry : LeaderboardEntry} | null> {
    try {
        const redis = GetRedis();
        const zrank = await redis.zrank(RedisKey(levelId), playerId);
        if (zrank === null) return null;
        const entry = (await EnrichPlayerIds(levelId, [playerId])).get(playerId);
        return entry ? {rank: zrank + 1, entry} : null;
    } catch {
        const ranked = await GetRankedEntriesFromPostgres(levelId);
        const index = ranked.findIndex(e => e.playerId === playerId);
        return index === -1 ? null : {rank: index + 1, entry: ranked[index]};
    }
}

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export async function HandleLeaderboardRequest(req : IncomingMessage, res : ServerResponse) : Promise<boolean> {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== "/api/leaderboard") return false;

    if (req.method === "GET") {
        const levelId = url.searchParams.get("levelId") ?? "";
        const playerId = url.searchParams.get("playerId");

        const top = await GetTopEntries(levelId);
        const response : LeaderboardResponse = {top};

        if (playerId && !top.some(e => e.playerId === playerId)) {
            const outside = await GetPlayerRank(levelId, playerId);
            if (outside && outside.rank > TOP_COUNT) response.outsideTop = outside;
        }

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(response));
        return true;
    }

    if (req.method === "POST") {
        if (await IsRateLimited(GetClientIp(req), "leaderboard", RATE_LIMIT, RATE_LIMIT_WINDOW_SECONDS)) {
            res.writeHead(429);
            res.end();
            return true;
        }

        let parsed : unknown;
        try {
            parsed = JSON.parse(await ReadBody(req));
        } catch {
            res.writeHead(400);
            res.end();
            return true;
        }
        if (!IsValidSubmission(parsed)) {
            res.writeHead(400);
            res.end();
            return true;
        }

        //A logged-in session always wins over whatever playerId the body claims - closes the
        //spoofing gap for anyone actually signed in. Anonymous callers keep today's behavior.
        const playerId = await ResolveEffectivePlayerId(req, parsed.playerId);

        let result;
        try {
            result = await pool.query(`
                WITH inserted AS (
                    INSERT INTO leaderboard_entries (level_id, player_id, time_seconds)
                    VALUES ($1, $2, $3)
                    RETURNING id, level_id, player_id, time_seconds, submitted_at
                )
                SELECT inserted.*, u.display_name FROM inserted JOIN users u ON u.id = inserted.player_id
            `, [parsed.levelId, playerId, parsed.timeSeconds]);
        } catch {
            //Most likely a playerId that doesn't exist (FK violation) - a bad/forged id, not a
            //server error, and left uncaught this would crash the process (server.ts's request
            //handler never awaits HandleLeaderboardRequest's caller-side promise).
            res.writeHead(400);
            res.end();
            return true;
        }

        //Best-effort - Postgres is already the durable write, so a Redis hiccup here just means
        //the next read falls back and re-backfills, not a failed submission.
        try {
            const redis = GetRedis();
            await redis.zadd(RedisKey(parsed.levelId), "LT", parsed.timeSeconds, playerId);
        } catch {
            //Ignore - see comment above.
        }

        res.writeHead(201, {"Content-Type": "application/json"});
        res.end(JSON.stringify(RowToEntry(result.rows[0])));
        return true;
    }

    return false;
}
