import type {IncomingMessage, ServerResponse} from "http";
import type {LeaderboardEntry, LeaderboardResponse, SubmitTimeRequest} from "nova-shared/leaderboard";

const TOP_COUNT = 5;

//In-memory until Postgres is wired up (see CLAUDE.md's leaderboard plan) - seeded with a few
//attempts so the panel has something real to show before anyone's actually played.
const attempts : LeaderboardEntry[] = [
    {id: "1", levelId: "test-world", playerName: "Nova", timeSeconds: 2.31, submittedAt: "2026-08-20T10:00:00.000Z"},
    {id: "2", levelId: "test-world", playerName: "Seum_Fan", timeSeconds: 8.77, submittedAt: "2026-08-22T14:00:00.000Z"},
    {id: "3", levelId: "test-world", playerName: "SpeedyG", timeSeconds: 1.02, submittedAt: "2026-08-25T09:00:00.000Z"},
    {id: "4", levelId: "test-world", playerName: "Grapple_King", timeSeconds: 3.9, submittedAt: "2026-08-26T09:00:00.000Z"},
    {id: "5", levelId: "test-world", playerName: "Wallhopper", timeSeconds: 6.18, submittedAt: "2026-08-27T09:00:00.000Z"},
    {id: "6", levelId: "test-world", playerName: "WallAhopper", timeSeconds: 6.18, submittedAt: "2026-08-27T09:00:00.000Z"},

];
let nextId = attempts.length + 1;

function ReadBody(req : IncomingMessage) : Promise<string> {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}

function IsValidSubmission(value : any) : value is SubmitTimeRequest {
    return typeof value?.levelId === "string" && typeof value?.playerName === "string"
        && typeof value?.timeSeconds === "number" && Number.isFinite(value.timeSeconds);
}

//Ranked by each player's own best time on this level, not raw attempts - otherwise retrying the
//same level over and over would flood the list with one player's own duplicate entries.
function GetRankedEntries(levelId : string) : LeaderboardEntry[] {
    const bestPerPlayer = new Map<string, LeaderboardEntry>();
    for (const attempt of attempts) {
        if (attempt.levelId !== levelId) continue;
        const existing = bestPerPlayer.get(attempt.playerName);
        if (!existing || attempt.timeSeconds < existing.timeSeconds) bestPerPlayer.set(attempt.playerName, attempt);
    }
    return [...bestPerPlayer.values()].sort((a, b) => a.timeSeconds - b.timeSeconds);
}

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export async function HandleLeaderboardRequest(req : IncomingMessage, res : ServerResponse) : Promise<boolean> {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== "/api/leaderboard") return false;

    if (req.method === "GET") {
        const levelId = url.searchParams.get("levelId") ?? "";
        const playerName = url.searchParams.get("playerName");

        const ranked = GetRankedEntries(levelId);
        const response : LeaderboardResponse = {top: ranked.slice(0, TOP_COUNT)};

        if (playerName) {
            const rank = ranked.findIndex(e => e.playerName === playerName) + 1;
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

        const entry : LeaderboardEntry = {
            id: String(nextId++),
            levelId: parsed.levelId,
            playerName: parsed.playerName,
            timeSeconds: parsed.timeSeconds,
            submittedAt: new Date().toISOString(),
        };
        attempts.push(entry);

        res.writeHead(201, {"Content-Type": "application/json"});
        res.end(JSON.stringify(entry));
        return true;
    }

    return false;
}
