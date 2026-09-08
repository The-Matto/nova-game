import type {IncomingMessage, ServerResponse} from "http";
import {randomUUID} from "crypto";
import type {DeleteLevelRequest, LevelSummary, RateLevelRequest, RecordLevelPlayRequest, UpdateLevelRequest, UploadLevelRequest} from "nova-shared/level-listing";
import {IsLevelTag} from "nova-shared/level-tags";
import {pool} from "./Db";
import {GetClientIp, IsRateLimited} from "./RateLimit";
import {ResolveEffectivePlayerId} from "./Session";
import {ReadBody} from "./Http";
import {DeleteFromR2, UploadToR2} from "./R2";
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
//Tight like upload - a permanent, destructive action isn't something a real player does often.
const DELETE_RATE_LIMIT = 5;
const DELETE_RATE_LIMIT_WINDOW_SECONDS = 60;
//Same tightness as upload - same cost (R2 writes + a DB row), just overwriting instead of creating.
const UPDATE_RATE_LIMIT = 5;
const UPDATE_RATE_LIMIT_WINDOW_SECONDS = 60;
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

function IsValidUpdate(value : any) : value is UpdateLevelRequest {
    return typeof value?.playerId === "string" && typeof value?.levelId === "string"
        && typeof value?.name === "string"
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

function IsValidDelete(value : any) : value is DeleteLevelRequest {
    return typeof value?.levelId === "string" && typeof value?.playerId === "string";
}

function RowToSummary(row : any) : LevelSummary {
    return {
        id: row.id,
        name: row.name,
        createdBy: row.created_by ?? "Unknown",
        authorId: row.author_id ?? null,
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
        SELECT l.id, l.name, l.author_id, u.display_name AS created_by, l.rating, l.created_at, l.path,
            l.thumbnail_url, l.description, ${TAGS_SUBQUERY}
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
            RETURNING id, name, author_id, rating, created_at, path, thumbnail_url, description
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

//Overwrites an existing level in place - same R2 keys, same row. Only the level's own author can
//do this (the SELECT below doubles as the ownership check, same reasoning as HandleDeleteLevel).
async function HandleUpdateLevel(req : IncomingMessage, res : ServerResponse) : Promise<void> {
    if (await IsRateLimited(GetClientIp(req), "update-level", UPDATE_RATE_LIMIT, UPDATE_RATE_LIMIT_WINDOW_SECONDS)) {
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
    if (!IsValidUpdate(parsed)) {
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

    //A logged-in session always wins over whatever playerId the body claims - same reasoning as
    //upload/rating/delete.
    const playerId = await ResolveEffectivePlayerId(req, parsed.playerId);

    const existing = await pool.query(
        "SELECT thumbnail_url FROM levels WHERE id = $1 AND author_id = $2",
        [parsed.levelId, playerId],
    );
    if (existing.rowCount === 0) {
        //Covers both "no such level" and "not yours" - not worth distinguishing for the client.
        res.writeHead(403);
        res.end();
        return;
    }

    const thumbnailExtension = thumbnailContentType === "image/png" ? "png" : "jpg";
    const [path, thumbnailUrl] = await Promise.all([
        UploadToR2(`levels/${parsed.levelId}/level.json`, levelDataBuffer, "application/json"),
        UploadToR2(`levels/${parsed.levelId}/thumbnail.${thumbnailExtension}`, thumbnailBuffer, thumbnailContentType),
    ]);

    //If the new thumbnail landed under a different extension than the old one, the old file is
    //now orphaned - clean it up (best-effort, same reasoning as HandleDeleteLevel).
    const oldExtension = (existing.rows[0].thumbnail_url as string | null)?.match(/\.(\w+)$/)?.[1];
    if (oldExtension && oldExtension !== thumbnailExtension) {
        DeleteFromR2(`levels/${parsed.levelId}/thumbnail.${oldExtension}`).catch(() => {});
    }

    //rating is deliberately left untouched - an edit doesn't invalidate what players already
    //thought of the level.
    const result = await pool.query(`
        WITH updated AS (
            UPDATE levels SET name = $1, path = $2, thumbnail_url = $3, description = $4
            WHERE id = $5
            RETURNING id, name, author_id, rating, created_at, path, thumbnail_url, description
        )
        SELECT updated.*, u.display_name AS created_by FROM updated JOIN users u ON u.id = updated.author_id
    `, [parsed.name.trim(), path, thumbnailUrl, parsed.description.trim(), parsed.levelId]);

    //Replace the tag set wholesale - simplest way to make it match the new submission exactly.
    await pool.query("DELETE FROM level_tags WHERE level_id = $1", [parsed.levelId]);
    const tags = [...new Set(parsed.tags)];
    if (tags.length > 0) {
        const values = tags.map((_, i) => `($1, $${i + 2})`).join(", ");
        await pool.query(`INSERT INTO level_tags (level_id, tag) VALUES ${values}`, [parsed.levelId, ...tags]);
    }

    res.writeHead(200, {"Content-Type": "application/json"});
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

//Only the level's own author can delete it - the DELETE...WHERE author_id = $2 below is the
//actual enforcement (atomic with fetching what to clean up from R2), not just a check beforehand.
async function HandleDeleteLevel(req : IncomingMessage, res : ServerResponse) : Promise<void> {
    if (await IsRateLimited(GetClientIp(req), "delete-level", DELETE_RATE_LIMIT, DELETE_RATE_LIMIT_WINDOW_SECONDS)) {
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
    if (!IsValidDelete(parsed)) {
        res.writeHead(400);
        res.end();
        return;
    }

    //A logged-in session always wins over whatever playerId the body claims - same reasoning as
    //upload/rating/leaderboard submission.
    const playerId = await ResolveEffectivePlayerId(req, parsed.playerId);

    const result = await pool.query(
        "DELETE FROM levels WHERE id = $1 AND author_id = $2 RETURNING thumbnail_url",
        [parsed.levelId, playerId],
    );
    if (result.rowCount === 0) {
        //Covers both "no such level" and "not yours" - not worth distinguishing for the client.
        res.writeHead(403);
        res.end();
        return;
    }

    //Best-effort - the DB row (the real source of truth for what's browsable) is already gone,
    //so a stray R2 object left behind is a storage leak, not a correctness problem.
    const thumbnailExtension = (result.rows[0].thumbnail_url as string | null)?.match(/\.(\w+)$/)?.[1];
    await Promise.all([
        DeleteFromR2(`levels/${parsed.levelId}/level.json`).catch(() => {}),
        thumbnailExtension ? DeleteFromR2(`levels/${parsed.levelId}/thumbnail.${thumbnailExtension}`).catch(() => {}) : Promise.resolve(),
    ]);

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
    if (url.pathname === "/api/levels" && req.method === "PUT") {
        await HandleUpdateLevel(req, res);
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
    if (url.pathname === "/api/levels" && req.method === "DELETE") {
        await HandleDeleteLevel(req, res);
        return true;
    }

    return false;
}
