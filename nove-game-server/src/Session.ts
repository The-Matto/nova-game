import type {IncomingMessage} from "http";
import {randomBytes} from "crypto";
import {GetRedis} from "./Redis";
import {GetCookie} from "./Cookies";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_COOKIE_NAME = "nova_session";

//Set only at the moment PlayersApi.ts mints a brand new anonymous user row - proves *this*
//browser is the one that id was actually issued to. HandleGitHubLogin (AuthApi.ts) reads this
//instead of trusting a client-supplied playerId, which used to let anyone link/hijack any
//account just by knowing its id (ids aren't secret - they're echoed in leaderboard entries).
export const ANON_ID_COOKIE_NAME = "nova_anon_id";
export const ANON_ID_COOKIE_TTL_SECONDS = SESSION_TTL_SECONDS;

function SessionKey(token : string) : string {
    return `session:${token}`;
}

export async function CreateSession(userId : string) : Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await GetRedis().set(SessionKey(token), userId, "EX", SESSION_TTL_SECONDS);
    return token;
}

export async function GetSessionUserId(token : string) : Promise<string | null> {
    try {
        return await GetRedis().get(SessionKey(token));
    } catch {
        return null;
    }
}

export async function DestroySession(token : string) : Promise<void> {
    try {
        await GetRedis().del(SessionKey(token));
    } catch {
        //Ignore - the cookie still gets cleared client-side either way.
    }
}

//Prefers the session's own user id over whatever playerId a request body claims - closes the
//gap where a logged-in caller could otherwise still submit/upload "as" a different, spoofed
//playerId. Anonymous callers (no session) keep trusting the body's claim, unchanged.
export async function ResolveEffectivePlayerId(req : IncomingMessage, claimedPlayerId : string) : Promise<string> {
    const token = GetCookie(req, SESSION_COOKIE_NAME);
    const sessionUserId = token ? await GetSessionUserId(token) : null;
    return sessionUserId ?? claimedPlayerId;
}
