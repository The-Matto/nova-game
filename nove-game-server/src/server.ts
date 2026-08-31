import {createServer} from "http";
import {clientsConnections, CreateSocketListener} from "./Sockets";
import {decodeBufferMessage} from "nova-shared/array-buffer-handler";
import {HandleLevelsRequest} from "./LevelsApi";
import {HandleLeaderboardRequest} from "./LeaderboardApi";
import {HandlePlayersRequest} from "./PlayersApi";

console.log("Launching Server");

const httpServer = createServer(async (req, res) => {
    try {
        if (await HandleLevelsRequest(req, res)) return;
        if (await HandlePlayersRequest(req, res)) return;
        if (await HandleLeaderboardRequest(req, res)) return;
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

CreateSocketListener(httpServer);

const PORT = 8080;
httpServer.listen(PORT, () => console.log('Start listening on port: ' + PORT));


//Setup game loop
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;
let testIncrement : number = 0;
setInterval(() => {
    const now = Date.now();
    //console.log("Tick")

    decodeBufferMessage(412);

    clientsConnections.forEach(async client => {
        //client.send(testIncrement.toString() )
        testIncrement++;
    })

}, TICK_INTERVAL);

