import {createServer} from "http";
import {HandleLevelsRequest} from "./LevelsApi";
import {HandleLeaderboardRequest} from "./LeaderboardApi";
import {HandlePlayersRequest} from "./PlayersApi";
import {HandleAuthRequest} from "./AuthApi";
import {IsTrustedRequest} from "./RateLimit";

console.log("Launching Server");

const httpServer = createServer(async (req, res) => {
    try {
        //Rejects anything not proxied through nova.mattheritage.dev's Cloudflare Pages Function -
        //Railway's own URL is also directly, publicly reachable, and there's no way to reliably
        //rate-limit (or otherwise identify) a caller that bypasses it. See RateLimit.ts.
        if (!IsTrustedRequest(req)) {
            res.writeHead(403);
            res.end();
            return;
        }

        if (await HandleLevelsRequest(req, res)) return;
        if (await HandlePlayersRequest(req, res)) return;
        if (await HandleLeaderboardRequest(req, res)) return;
        if (await HandleAuthRequest(req, res)) return;
        res.writeHead(404);
        res.end();
    } catch (err) {
        //A *Api.ts handler now does real DB calls that can throw - catch here as a last resort
        //so a transient DB error 500s this one request instead of crashing the whole process.
        console.error(err);
        if (!res.headersSent) res.writeHead(500);
        res.end();
    }
});

//Disabled - unauthenticated (any UID) and unreachable via the Cloudflare proxy anyway (no code
//path proxies /game), so it was pure attack surface for a feature (multiplayer/ghosts) nothing
//actually uses yet. Sockets.ts is otherwise untouched - re-enable this once that's real and its
//UID param is actually verified against a real session/player id.
//CreateSocketListener(httpServer);

//Railway (and most hosts) inject PORT and expect the app to bind to it, rather than a fixed one.
const PORT = Number(process.env.PORT) || 8080;
httpServer.listen(PORT, () => console.log('Start listening on port: ' + PORT));

