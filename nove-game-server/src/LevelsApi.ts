import type {IncomingMessage, ServerResponse} from "http";
import type {LevelSummary} from "nova-shared/level-listing";

//Hardcoded until levels are actually uploaded/stored (see CLAUDE.md's Postgres plan) - just
//enough for the client's level browser to have something real to fetch.
const LEVELS : LevelSummary[] = [
    {
        id: "test-world",
        name: "Test World",
        createdBy: "Nova Team",
        rating: 4.5,
        uploadedAt: "2026-08-01T00:00:00.000Z",
        path: "/TestWorld.json",
        thumbnailUrl: "/thumbnails/test-world.png",
    },
];

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export function HandleLevelsRequest(req : IncomingMessage, res : ServerResponse) : boolean {
    if (req.method === "GET" && req.url === "/api/levels") {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify(LEVELS));
        return true;
    }
    return false;
}
