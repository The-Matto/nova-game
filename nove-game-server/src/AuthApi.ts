import type {IncomingMessage, ServerResponse} from "http";
import {randomBytes} from "crypto";
import type {AuthMeResponse} from "nova-shared/auth";
import {pool} from "./Db";
import {GetRedis} from "./Redis";
import {GetGitHubOAuthConfig} from "./GitHubOAuth";
import {CreateSession, DestroySession, GetSessionUserId, SESSION_COOKIE_NAME} from "./Session";
import {BuildClearCookie, BuildSetCookie, GetCookie} from "./Cookies";

const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
//GitHub's API requires a User-Agent on every request - it's not optional like most REST APIs.
const GITHUB_USER_AGENT = "nova-game";

function OAuthStateKey(state : string) : string {
    return `oauth_state:${state}`;
}

//Kicks off the redirect to GitHub - state is a random, server-generated, single-use key into
//Redis (not the playerId itself) so a tampered state param can't link GitHub to the wrong
//account; only the value this server already put there is ever trusted back.
async function HandleGitHubLogin(req : IncomingMessage, res : ServerResponse, url : URL) : Promise<void> {
    const playerId = url.searchParams.get("playerId");
    if (!playerId) {
        res.writeHead(400);
        res.end();
        return;
    }

    const state = randomBytes(24).toString("base64url");
    await GetRedis().set(OAuthStateKey(state), playerId, "EX", OAUTH_STATE_TTL_SECONDS);

    const {clientId, redirectUri} = GetGitHubOAuthConfig();
    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "read:user user:email");
    authUrl.searchParams.set("state", state);

    res.writeHead(302, {Location: authUrl.toString()});
    res.end();
}

//GitHub doesn't hand back a signed id token like Google - just an access token, exchanged for
//one plain REST call to fetch the profile.
async function FetchGitHubProfile(code : string) : Promise<{id : string, email : string | undefined, name : string | undefined}> {
    const {clientId, clientSecret, redirectUri} = GetGitHubOAuthConfig();

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {"Content-Type": "application/json", "Accept": "application/json"},
        body: JSON.stringify({client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri}),
    });
    const tokenBody = await tokenRes.json();
    if (!tokenBody.access_token) throw new Error(`GitHub token exchange failed: ${JSON.stringify(tokenBody)}`);

    const authHeaders = {Authorization: `Bearer ${tokenBody.access_token}`, "User-Agent": GITHUB_USER_AGENT};
    const userRes = await fetch("https://api.github.com/user", {headers: authHeaders});
    const user = await userRes.json();
    if (!user.id) throw new Error(`GitHub user fetch failed: ${JSON.stringify(user)}`);

    //Email is only in /user if the user's made it public - otherwise it needs the separate
    ///user/emails endpoint (still covered by the user:email scope requested above).
    let email : string | undefined = user.email ?? undefined;
    if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", {headers: authHeaders});
        const emails = await emailsRes.json();
        email = Array.isArray(emails) ? emails.find((e : any) => e.primary && e.verified)?.email : undefined;
    }

    return {id: String(user.id), email, name: user.name ?? user.login};
}

async function HandleGitHubCallback(req : IncomingMessage, res : ServerResponse, url : URL) : Promise<void> {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
        res.writeHead(400);
        res.end();
        return;
    }

    const redis = GetRedis();
    const playerId = await redis.get(OAuthStateKey(state));
    if (!playerId) {
        res.writeHead(400);
        res.end("Login link expired - please try again.");
        return;
    }
    await redis.del(OAuthStateKey(state));

    let githubId : string, email : string | undefined, name : string | undefined;
    try {
        ({id: githubId, email, name} = await FetchGitHubProfile(code));
    } catch (err) {
        console.error("GitHub OAuth exchange failed:", err);
        res.writeHead(400);
        res.end("GitHub sign-in failed - please try again.");
        return;
    }

    //Already linked (by anyone) - log into that account rather than creating a duplicate link.
    //Otherwise, link this GitHub identity to whichever playerId started the flow.
    const existing = await pool.query(
        "SELECT user_id FROM oauth_identities WHERE provider = 'github' AND provider_user_id = $1",
        [githubId],
    );

    const sessionUserId : string = existing.rowCount === 0 ? playerId : existing.rows[0].user_id;

    if (existing.rowCount === 0) {
        await pool.query(
            "INSERT INTO oauth_identities (user_id, provider, provider_user_id, email) VALUES ($1, 'github', $2, $3) ON CONFLICT (provider, provider_user_id) DO NOTHING",
            [sessionUserId, githubId, email ?? null],
        );
        //Only overwrite the auto-generated anonymous name on a first link, not on every login.
        await pool.query(
            "UPDATE users SET claimed_at = now(), display_name = COALESCE($2, display_name) WHERE id = $1 AND claimed_at IS NULL",
            [sessionUserId, name ?? null],
        );
    }

    const sessionToken = await CreateSession(sessionUserId);
    res.writeHead(302, {
        Location: "/",
        "Set-Cookie": BuildSetCookie(req, SESSION_COOKIE_NAME, sessionToken, SESSION_MAX_AGE_SECONDS),
    });
    res.end();
}

async function HandleMe(req : IncomingMessage, res : ServerResponse) : Promise<void> {
    const token = GetCookie(req, SESSION_COOKIE_NAME);
    const userId = token ? await GetSessionUserId(token) : null;

    if (userId) {
        const result = await pool.query(
            "SELECT u.id, u.display_name, o.email FROM users u LEFT JOIN oauth_identities o ON o.user_id = u.id WHERE u.id = $1",
            [userId],
        );
        if (result.rowCount! > 0) {
            const row = result.rows[0];
            const response : AuthMeResponse = {loggedIn: true, id: row.id, displayName: row.display_name, email: row.email ?? undefined};
            res.writeHead(200, {"Content-Type": "application/json"});
            res.end(JSON.stringify(response));
            return;
        }
    }

    const response : AuthMeResponse = {loggedIn: false};
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify(response));
}

async function HandleLogout(req : IncomingMessage, res : ServerResponse) : Promise<void> {
    const token = GetCookie(req, SESSION_COOKIE_NAME);
    if (token) await DestroySession(token);

    res.writeHead(204, {"Set-Cookie": BuildClearCookie(req, SESSION_COOKIE_NAME)});
    res.end();
}

//Returns true if it handled the request, so the caller knows to fall through to a 404 otherwise.
export async function HandleAuthRequest(req : IncomingMessage, res : ServerResponse) : Promise<boolean> {
    const url = new URL(req.url ?? "", "http://localhost");

    if (url.pathname === "/api/auth/github/login" && req.method === "GET") {
        await HandleGitHubLogin(req, res, url);
        return true;
    }
    if (url.pathname === "/api/auth/github/callback" && req.method === "GET") {
        await HandleGitHubCallback(req, res, url);
        return true;
    }
    if (url.pathname === "/api/auth/me" && req.method === "GET") {
        await HandleMe(req, res);
        return true;
    }
    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
        await HandleLogout(req, res);
        return true;
    }

    return false;
}
