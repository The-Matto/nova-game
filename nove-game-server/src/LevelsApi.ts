import type {IncomingMessage, ServerResponse} from "http";
import {randomUUID} from "crypto";
import type {LevelSummary, UploadLevelRequest} from "nova-shared/level-listing";
import {pool} from "./Db";
import {GetClientIp, IsRateLimited} from "./RateLimit";
import {ReadBody} from "./Http";
import {UploadToR2} from "./R2";

const MAX_NAME_LENGTH = 80;
//Tighter than the other endpoints - this is the costliest one (R2 writes + a DB row), and
//uploading a level isn't something a real player does often.
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_LEVEL_DATA_BYTES = 2 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 3 * 1024 * 1024;
const THUMBNAIL_DATA_URL = /^data:(image\/(?:jpeg|png));base64,(.+)$/;

function IsValidUpload(value : any) : value is UploadLevelRequest {
    return typeof value?.playerId === "string" && typeof value?.name === "string"
        && value.name.trim().length > 0 && value.name.trim().length <= MAX_NAME_LENGTH
        && typeof value?.levelData === "object" && value.levelData !== null
        && Array.isArray(value.levelData.actorsToSpawn)
        && typeof value?.thumbnailDataUrl === "string";
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
    };
}

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export async function HandleLevelsRequest(req : IncomingMessage, res : ServerResponse) : Promise<boolean> {
    if (req.url !== "/api/levels") return false;

    if (req.method === "GET") {
        //path IS NOT NULL - a level with only level_data (used before it's uploaded, see below)
        //has nothing the client can actually load, so it's excluded rather than returned broken.
        //LEFT JOIN since author_id can be null (an anonymous author who's since been wiped - see
        //0006_anonymous_player_cleanup.sql) - the level survives that, just loses its byline.
        const result = await pool.query(`
            SELECT l.id, l.name, u.display_name AS created_by, l.rating, l.created_at, l.path, l.thumbnail_url
            FROM levels l
            LEFT JOIN users u ON u.id = l.author_id
            WHERE l.path IS NOT NULL
            ORDER BY l.created_at ASC
        `);

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(result.rows.map(RowToSummary)));
        return true;
    }

    if (req.method === "POST") {
        if (await IsRateLimited(GetClientIp(req), "levels", RATE_LIMIT, RATE_LIMIT_WINDOW_SECONDS)) {
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
        if (!IsValidUpload(parsed)) {
            res.writeHead(400);
            res.end();
            return true;
        }

        const thumbnailMatch = THUMBNAIL_DATA_URL.exec(parsed.thumbnailDataUrl);
        if (!thumbnailMatch) {
            res.writeHead(400);
            res.end();
            return true;
        }
        const thumbnailContentType = thumbnailMatch[1];
        const thumbnailBuffer = Buffer.from(thumbnailMatch[2], "base64");
        const levelDataBuffer = Buffer.from(JSON.stringify(parsed.levelData));

        if (levelDataBuffer.byteLength > MAX_LEVEL_DATA_BYTES || thumbnailBuffer.byteLength > MAX_THUMBNAIL_BYTES) {
            res.writeHead(413);
            res.end();
            return true;
        }

        //Checked before touching R2 at all - a bad/forged playerId shouldn't leave orphaned
        //objects behind (unlike a plain DB insert, an R2 upload has no transaction to roll back).
        const authorExists = await pool.query("SELECT 1 FROM users WHERE id = $1", [parsed.playerId]);
        if (authorExists.rowCount === 0) {
            res.writeHead(400);
            res.end();
            return true;
        }

        const id = randomUUID();
        const thumbnailExtension = thumbnailContentType === "image/png" ? "png" : "jpg";
        const [path, thumbnailUrl] = await Promise.all([
            UploadToR2(`levels/${id}/level.json`, levelDataBuffer, "application/json"),
            UploadToR2(`levels/${id}/thumbnail.${thumbnailExtension}`, thumbnailBuffer, thumbnailContentType),
        ]);

        const result = await pool.query(`
            WITH inserted AS (
                INSERT INTO levels (id, author_id, name, path, thumbnail_url)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, name, rating, created_at, path, thumbnail_url
            )
            SELECT inserted.*, u.display_name AS created_by FROM inserted JOIN users u ON u.id = $2
        `, [id, parsed.playerId, parsed.name.trim(), path, thumbnailUrl]);

        res.writeHead(201, {"Content-Type": "application/json"});
        res.end(JSON.stringify(RowToSummary(result.rows[0])));
        return true;
    }

    return false;
}
