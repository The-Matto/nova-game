import type {IncomingMessage, ServerResponse} from "http";
import {randomUUID} from "crypto";
import type {LevelSummary, RateLevelRequest, RecordLevelPlayRequest, UploadLevelRequest} from "nova-shared/level-listing";
import {IsLevelTag} from "nova-shared/level-tags";
import {pool} from "./Db";
import {GetClientIp, IsRateLimited} from "./RateLimit";
import {ResolveEffectivePlayerId} from "./Session";
import {ReadBody} from "./Http";
import {UploadToR2} from "./R2";
import {GetWeeklyPlays, RecordLevelPlay} from "./WeeklyPlays";

const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 500;
//Tighter than the other endpoints - this is the costliest one (R2 writes + a DB row), and
//uploading a level isn't something a real player does often.
const UPLOAD_RATE_LIMIT = 5;
const UPLOAD_RATE_LIMIT_WINDOW_SECONDS = 60;
//More generous - rating a level after every playthrough is the expected common case.
const RATING_RATE_LIMIT = 20;
const RATING_RATE_LIMIT_WINDOW_SECONDS = 60;
//Generous like rating - every "Play" click hits this once, which is the expected common case.
const PLAY_RATE_LIMIT = 30;
const PLAY_RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_LEVEL_DATA_BYTES = 2 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 3 * 1024 * 1024;
const THUMBNAIL_DATA_URL = /^data:(image\/(?:jpeg|png));base64,(.+)$/;

function IsValidUpload(value : any) : value is UploadLevelRequest {
    return typeof value?.playerId === "string" && typeof value?.name === "string"
        && value.name.trim().length > 0 && value.name.trim().length <= MAX_NAME_LENGTH
        && typeof value?.levelData === "object" && value.levelData !== null
        && Array.isArray(value.levelData.actorsToSpawn)
        && typeof value?.thumbnailDataUrl === "string"
        && Array.isArray(value?.tags) && value.tags.every(IsLevelTag)
        && typeof value?.description === "string" && value.description.length <= MAX_DESCRIPTION_LENGTH;
}

function IsValidRating(value : any) : value is RateLevelRequest {
    return typeof value?.levelId === "string" && typeof value?.playerId === "string"
        && Number.isInteger(value?.rating) && value.rating >= 1 && value.rating <= 5;
}

function IsValidPlay(value : any) : value is RecordLevelPlayRequest {
    return typeof value?.levelId === "string" && value.levelId.length > 0;
}

function RowToSummary(row : any) : LevelSummary {
    return {
        id: row.id,
        name: row.name,
        createdBy: row.created_by ?? "Unknown",
        rating: Number(row.rating),
        uploadedAt: row.created_at.toISOString(),
        path: row.path,
        thumbnailUrl: row.thumbnail_url ?? undefined,
        tags: row.tags ?? [],
        description: row.description ?? "",
        weeklyPlays: row.weekly_plays ?? 0,
    };
}

//Reused everywhere a LevelSummary is built from a `levels` row - a scalar subquery rather than a
//JOIN + GROUP BY, so callers keep selecting plain l.* columns without worrying about aggregation.
const TAGS_SUBQUERY = `COALESCE(
    (SELECT array_agg(tag ORDER BY tag) FROM level_tags WHERE level_id = l.id), '{}'
) AS tags`;

async function HandleGetLevels(res : ServerResponse) : Promise<void> {
    //path IS NOT NULL - a level with only level_data (used before it's uploaded, see below)
    //has nothing the client can actually load, so it's excluded rather than returned broken.
    //LEFT JOIN since author_id can be null (an anonymous author who's since been wiped - see
    //0006_anonymous_player_cleanup.sql) - the level survives that, just loses its byline.
    const result = await pool.query(`
        SELECT l.id, l.name, u.display_name AS created_by, l.rating, l.created_at, l.path, l.thumbnail_url,
            l.description, ${TAGS_SUBQUERY}
        FROM levels l
        LEFT JOIN users u ON u.id = l.author_id
        WHERE l.path IS NOT NULL
        ORDER BY l.created_at ASC
    `);

    //Redis-only, so it's fetched separately from the Postgres row itself - see WeeklyPlays.ts.
    const weeklyPlays = await GetWeeklyPlays(result.rows.map(row => row.id));
    const summaries = result.rows.map(row => RowToSummary({...row, weekly_plays: weeklyPlays.get(row.id) ?? 0}));

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(summaries));
}

async function HandleUploadLevel(req : IncomingMessage, res : ServerResponse) : Promise<void> {
    if (await IsRateLimited(GetClientIp(req), "levels", UPLOAD_RATE_LIMIT, UPLOAD_RATE_LIMIT_WINDOW_SECONDS)) {
        res.writeHead(429);
        res.end();
        return;
    }

    let parsed : unknown;
    try {
        parsed = JSON.parse(await ReadBody(req));
    } catch {
        res.writeHead(400);
        res.end();
        return;
    }
    if (!IsValidUpload(parsed)) {
        res.writeHead(400);
        res.end();
        return;
    }

    const thumbnailMatch = THUMBNAIL_DATA_URL.exec(parsed.thumbnailDataUrl);
    if (!thumbnailMatch) {
        res.writeHead(400);
        res.end();
        return;
    }
    const thumbnailContentType = thumbnailMatch[1];
    const thumbnailBuffer = Buffer.from(thumbnailMatch[2], "base64");
    const levelDataBuffer = Buffer.from(JSON.stringify(parsed.levelData));

    if (levelDataBuffer.byteLength > MAX_LEVEL_DATA_BYTES || thumbnailBuffer.byteLength > MAX_THUMBNAIL_BYTES) {
        res.writeHead(413);
        res.end();
        return;
    }

    //A logged-in session always wins over whatever playerId the body claims - closes the
    //spoofing gap for anyone actually signed in. Anonymous callers keep today's behavior.
    const playerId = await ResolveEffectivePlayerId(req, parsed.playerId);

    //Checked before touching R2 at all - a bad/forged playerId shouldn't leave orphaned
    //objects behind (unlike a plain DB insert, an R2 upload has no transaction to roll back).
    const authorExists = await pool.query("SELECT 1 FROM users WHERE id = $1", [playerId]);
    if (authorExists.rowCount === 0) {
        res.writeHead(400);
        res.end();
        return;
    }

    const id = randomUUID();
    const thumbnailExtension = thumbnailContentType === "image/png" ? "png" : "jpg";
    const [path, thumbnailUrl] = await Promise.all([
        UploadToR2(`levels/${id}/level.json`, levelDataBuffer, "application/json"),
        UploadToR2(`levels/${id}/thumbnail.${thumbnailExtension}`, thumbnailBuffer, thumbnailContentType),
    ]);

    const result = await pool.query(`
        WITH inserted AS (
            INSERT INTO levels (id, author_id, name, path, thumbnail_url, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, rating, created_at, path, thumbnail_url, description
        )
        SELECT inserted.*, u.display_name AS created_by FROM inserted JOIN users u ON u.id = $2
    `, [id, playerId, parsed.name.trim(), path, thumbnailUrl, parsed.description.trim()]);

    const tags = [...new Set(parsed.tags)];
    if (tags.length > 0) {
        const values = tags.map((_, i) => `($1, $${i + 2})`).join(", ");
        await pool.query(`INSERT INTO level_tags (level_id, tag) VALUES ${values}`, [id, ...tags]);
    }

    res.writeHead(201, {"Content-Type": "application/json"});
    res.end(JSON.stringify({...RowToSummary(result.rows[0]), tags}));
}

//Upserted per (levelId, playerId) - re-rating updates that player's existing score rather than
//piling up duplicates, so levels.rating (recomputed here) stays a true one-vote-per-player average.
async function HandleRateLevel(req : IncomingMessage, res : ServerResponse) : Promise<void> {
    if (await IsRateLimited(GetClientIp(req), "rate-level", RATING_RATE_LIMIT, RATING_RATE_LIMIT_WINDOW_SECONDS)) {
        res.writeHead(429);
        res.end();
        return;
    }

    let parsed : unknown;
    try {
        parsed = JSON.parse(await ReadBody(req));
    } catch {
        res.writeHead(400);
        res.end();
        return;
    }
    if (!IsValidRating(parsed)) {
        res.writeHead(400);
        res.end();
        return;
    }

    //A logged-in session always wins over whatever playerId the body claims - same reasoning as
    //upload/leaderboard submission.
    const playerId = await ResolveEffectivePlayerId(req, parsed.playerId);

    try {
        await pool.query(`
            INSERT INTO level_ratings (level_id, player_id, rating)
            VALUES ($1, $2, $3)
            ON CONFLICT (level_id, player_id) DO UPDATE SET rating = $3, rated_at = now()
        `, [parsed.levelId, playerId, parsed.rating]);
    } catch {
        //Most likely a bad/forged levelId or playerId (FK violation), not a server error.
        res.writeHead(400);
        res.end();
        return;
    }

    const result = await pool.query(`
        UPDATE levels SET rating = (SELECT AVG(rating) FROM level_ratings WHERE level_id = $1)
        WHERE id = $1
        RETURNING rating
    `, [parsed.levelId]);

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({rating: Number(result.rows[0].rating)}));
}

//Fire-and-forget on the client (see MainMenu.tsx/App.tsx) - increments this level's this-week
//play counter in Redis. No response body needed; a bad/forged levelId just wastes a small Redis
//key, not worth an extra DB round trip to validate against.
async function HandleRecordPlay(req : IncomingMessage, res : ServerResponse) : Promise<void> {
    if (await IsRateLimited(GetClientIp(req), "play-level", PLAY_RATE_LIMIT, PLAY_RATE_LIMIT_WINDOW_SECONDS)) {
        res.writeHead(429);
        res.end();
        return;
    }

    let parsed : unknown;
    try {
        parsed = JSON.parse(await ReadBody(req));
    } catch {
        res.writeHead(400);
        res.end();
        return;
    }
    if (!IsValidPlay(parsed)) {
        res.writeHead(400);
        res.end();
        return;
    }

    await RecordLevelPlay(parsed.levelId);
    res.writeHead(204);
    res.end();
}

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export async function HandleLevelsRequest(req : IncomingMessage, res : ServerResponse) : Promise<boolean> {
    const url = new URL(req.url ?? "", "http://localhost");

    if (url.pathname === "/api/levels" && req.method === "GET") {
        await HandleGetLevels(res);
        return true;
    }
    if (url.pathname === "/api/levels" && req.method === "POST") {
        await HandleUploadLevel(req, res);
        return true;
    }
    if (url.pathname === "/api/levels/rating" && req.method === "POST") {
        await HandleRateLevel(req, res);
        return true;
    }
    if (url.pathname === "/api/levels/play" && req.method === "POST") {
        await HandleRecordPlay(req, res);
        return true;
    }

    return false;
}
