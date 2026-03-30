import {clientsConnections, CreateSocketListener} from "./Sockets";
import {decodeBufferMessage} from "nova-shared/array-buffer-handler";




console.log("Launching Server");
const socket = CreateSocketListener();


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

