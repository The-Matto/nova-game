import type {IncomingMessage, ServerResponse} from "http";
import type {LevelSummary} from "nova-shared/level-listing";
import {pool} from "./Db";

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export async function HandleLevelsRequest(req : IncomingMessage, res : ServerResponse) : Promise<boolean> {
    if (req.method !== "GET" || req.url !== "/api/levels") return false;

    //path IS NOT NULL - a level with only level_data (a real upload, not built yet - see
    //TODO.md) has nothing the client can actually load right now, so it's excluded rather than
    //returned broken.
    const result = await pool.query(`
        SELECT l.id, l.name, u.display_name AS created_by, l.rating, l.created_at, l.path, l.thumbnail_url
        FROM levels l
        JOIN users u ON u.id = l.author_id
        WHERE l.path IS NOT NULL
        ORDER BY l.created_at ASC
    `);

    const levels : LevelSummary[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        createdBy: row.created_by,
        rating: Number(row.rating),
        uploadedAt: row.created_at.toISOString(),
        path: row.path,
        thumbnailUrl: row.thumbnail_url ?? undefined,
    }));

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(levels));
    return true;
}
