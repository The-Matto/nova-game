import type {IncomingMessage, ServerResponse} from "http";
import type {PlayerIdentityDto, RegisterPlayerRequest} from "nova-shared/player";
import type {PersonalBest, PlayerProfile} from "nova-shared/profile";
import {pool} from "./Db";
import {GetClientIp, IsRateLimited} from "./RateLimit";
import {ReadBody} from "./Http";
import {ANONYMOUS_ACCOUNT_GRACE_PERIOD_DAYS} from "./AccountLifetime";

const MAX_DISPLAY_NAME_LENGTH = 40;
//A real browser registers once ever (see PlayerIdentity.ts) - this just caps a script hammering
//the endpoint to mint fake users, not normal usage.
const REGISTER_RATE_LIMIT = 10;
const REGISTER_RATE_LIMIT_WINDOW_SECONDS = 60;
//More generous - browsing several players' profiles in one session is normal. Still worth a cap
//since it's three queries per call, heavier than the other GETs.
const PROFILE_RATE_LIMIT = 30;
const PROFILE_RATE_LIMIT_WINDOW_SECONDS = 60;

function IsValidRegistration(value : any) : value is RegisterPlayerRequest {
    return typeof value?.displayName === "string"
        && value.displayName.trim().length > 0 && value.displayName.trim().length <= MAX_DISPLAY_NAME_LENGTH;
}

async function HandleRegister(req : IncomingMessage, res : ServerResponse) : Promise<void> {
    if (await IsRateLimited(GetClientIp(req), "players", REGISTER_RATE_LIMIT, REGISTER_RATE_LIMIT_WINDOW_SECONDS)) {
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
    if (!IsValidRegistration(parsed)) {
        res.writeHead(400);
        res.end();
        return;
    }

    const result = await pool.query(
        "INSERT INTO users (display_name) VALUES ($1) RETURNING id, display_name",
        [parsed.displayName.trim()],
    );

    const dto : PlayerIdentityDto = {id: result.rows[0].id, displayName: result.rows[0].display_name};
    res.writeHead(201, {"Content-Type": "application/json"});
    res.end(JSON.stringify(dto));
}

//Public - anyone can view anyone's profile (levels they've made, their best time per level).
async function HandleProfile(req : IncomingMessage, res : ServerResponse, url : URL) : Promise<void> {
    if (await IsRateLimited(GetClientIp(req), "profile", PROFILE_RATE_LIMIT, PROFILE_RATE_LIMIT_WINDOW_SECONDS)) {
        res.writeHead(429);
        res.end();
        return;
    }

    const playerId = url.searchParams.get("playerId");
    if (!playerId) {
        res.writeHead(400);
        res.end();
        return;
    }

    const user = await pool.query("SELECT display_name, claimed_at, created_at FROM users WHERE id = $1", [playerId]);
    if (user.rowCount === 0) {
        res.writeHead(404);
        res.end();
        return;
    }

    const deletionAt = user.rows[0].claimed_at
        ? null
        : new Date(user.rows[0].created_at.getTime() + ANONYMOUS_ACCOUNT_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

    //Most recent 5 - a profile page, not the full level browser.
    const levels = await pool.query(
        `SELECT l.id, l.name, u.display_name AS created_by, l.rating, l.created_at, l.path, l.thumbnail_url,
             l.description, l.total_plays,
             COALESCE((SELECT array_agg(tag ORDER BY tag) FROM level_tags WHERE level_id = l.id), '{}') AS tags
         FROM levels l
         LEFT JOIN users u ON u.id = l.author_id
         WHERE l.author_id = $1 AND l.path IS NOT NULL
         ORDER BY l.created_at DESC
         LIMIT 5`,
        [playerId],
    );

    //One row per level this player's played, their best time on each (not one level's top N),
    //limited to the 5 most recently played.
    const bests = await pool.query(
        `SELECT level_id, level_name, time_seconds, path, thumbnail_url FROM (
             SELECT DISTINCT ON (le.level_id) le.level_id, l.name AS level_name, le.time_seconds,
                 le.submitted_at, l.path, l.thumbnail_url
             FROM leaderboard_entries le
             JOIN levels l ON l.id = le.level_id
             WHERE le.player_id = $1 AND l.path IS NOT NULL
             ORDER BY le.level_id, le.time_seconds ASC
         ) best
         ORDER BY submitted_at DESC
         LIMIT 5`,
        [playerId],
    );

    const profile : PlayerProfile = {
        id: playerId,
        displayName: user.rows[0].display_name,
        levels: levels.rows.map(row => ({
            id: row.id,
            name: row.name,
            createdBy: row.created_by ?? "Unknown",
            //The query itself is WHERE l.author_id = playerId - every row here is already theirs.
            authorId: playerId,
            rating: Number(row.rating),
            uploadedAt: row.created_at.toISOString(),
            path: row.path,
            thumbnailUrl: row.thumbnail_url ?? undefined,
            tags: row.tags ?? [],
            description: row.description ?? "",
            //Not computed here - a profile's own-levels list isn't sorted/shown by popularity,
            //so it's not worth an extra Redis round trip on every profile view (see LevelsApi.ts).
            weeklyPlays: 0,
            totalPlays: Number(row.total_plays ?? 0),
        })),
        personalBests: bests.rows.map((row) : PersonalBest => ({
            levelId: row.level_id,
            levelName: row.level_name,
            timeSeconds: Number(row.time_seconds),
            levelPath: row.path,
            thumbnailUrl: row.thumbnail_url ?? undefined,
        })),
        deletionAt,
    };

    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(profile));
}

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export async function HandlePlayersRequest(req : IncomingMessage, res : ServerResponse) : Promise<boolean> {
    const url = new URL(req.url ?? "", "http://localhost");

    if (url.pathname === "/api/players" && req.method === "POST") {
        await HandleRegister(req, res);
        return true;
    }
    if (url.pathname === "/api/players/profile" && req.method === "GET") {
        await HandleProfile(req, res, url);
        return true;
    }

    return false;
}
