import type {IncomingMessage, ServerResponse} from "http";
import type {LeaderboardEntry, LeaderboardResponse, SubmitTimeRequest} from "nova-shared/leaderboard";
import {pool} from "./Db";
import {ReadBody} from "./Http";

const TOP_COUNT = 5;

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

//Ranked by each player's own best time on this level, not raw attempts - otherwise retrying the
//same level over and over would flood the list with one player's own duplicate entries.
async function GetRankedEntries(levelId : string) : Promise<LeaderboardEntry[]> {
    const result = await pool.query(`
        SELECT DISTINCT ON (le.player_id) le.id, le.level_id, le.player_id, le.time_seconds, le.submitted_at, u.display_name
        FROM leaderboard_entries le
        JOIN users u ON u.id = le.player_id
        WHERE le.level_id = $1
        ORDER BY le.player_id, le.time_seconds ASC
    `, [levelId]);

    return result.rows.map(RowToEntry).sort((a, b) => a.timeSeconds - b.timeSeconds);
}

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export async function HandleLeaderboardRequest(req : IncomingMessage, res : ServerResponse) : Promise<boolean> {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== "/api/leaderboard") return false;

    if (req.method === "GET") {
        const levelId = url.searchParams.get("levelId") ?? "";
        const playerId = url.searchParams.get("playerId");

        const ranked = await GetRankedEntries(levelId);
        const response : LeaderboardResponse = {top: ranked.slice(0, TOP_COUNT)};

        if (playerId) {
            const rank = ranked.findIndex(e => e.playerId === playerId) + 1;
            if (rank > TOP_COUNT) response.outsideTop = {entry: ranked[rank - 1], rank};
        }

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(response));
        return true;
    }

    if (req.method === "POST") {
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

        let result;
        try {
            result = await pool.query(`
                WITH inserted AS (
                    INSERT INTO leaderboard_entries (level_id, player_id, time_seconds)
                    VALUES ($1, $2, $3)
                    RETURNING id, level_id, player_id, time_seconds, submitted_at
                )
                SELECT inserted.*, u.display_name FROM inserted JOIN users u ON u.id = inserted.player_id
            `, [parsed.levelId, parsed.playerId, parsed.timeSeconds]);
        } catch {
            //Most likely a playerId that doesn't exist (FK violation) - a bad/forged id, not a
            //server error, and left uncaught this would crash the process (server.ts's request
            //handler never awaits HandleLeaderboardRequest's caller-side promise).
            res.writeHead(400);
            res.end();
            return true;
        }

        res.writeHead(201, {"Content-Type": "application/json"});
        res.end(JSON.stringify(RowToEntry(result.rows[0])));
        return true;
    }

    return false;
}
