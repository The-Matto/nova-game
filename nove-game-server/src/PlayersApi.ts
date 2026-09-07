import type {IncomingMessage, ServerResponse} from "http";
import type {PlayerIdentityDto, RegisterPlayerRequest} from "nova-shared/player";
import {pool} from "./Db";
import {ReadBody} from "./Http";

const MAX_DISPLAY_NAME_LENGTH = 40;

function IsValidRegistration(value : any) : value is RegisterPlayerRequest {
    return typeof value?.displayName === "string"
        && value.displayName.trim().length > 0 && value.displayName.trim().length <= MAX_DISPLAY_NAME_LENGTH;
}

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export async function HandlePlayersRequest(req : IncomingMessage, res : ServerResponse) : Promise<boolean> {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== "/api/players" || req.method !== "POST") return false;

    let parsed : unknown;
    try {
        parsed = JSON.parse(await ReadBody(req));
    } catch {
        res.writeHead(400);
        res.end();
        return true;
    }
    if (!IsValidRegistration(parsed)) {
        res.writeHead(400);
        res.end();
        return true;
    }

    const result = await pool.query(
        "INSERT INTO users (display_name) VALUES ($1) RETURNING id, display_name",
        [parsed.displayName.trim()],
    );

    const dto : PlayerIdentityDto = {id: result.rows[0].id, displayName: result.rows[0].display_name};
    res.writeHead(201, {"Content-Type": "application/json"});
    res.end(JSON.stringify(dto));
    return true;
}
