import {createServer} from "http";
import {clientsConnections, CreateSocketListener} from "./Sockets";
import {decodeBufferMessage} from "nova-shared/array-buffer-handler";
import {HandleLevelsRequest} from "./LevelsApi";

console.log("Launching Server");

const httpServer = createServer((req, res) => {
    if (HandleLevelsRequest(req, res)) return;
    res.writeHead(404);
    res.end();
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

