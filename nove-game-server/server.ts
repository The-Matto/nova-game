import {clientsConnections, CreateSocketListener} from "./Sockets";




console.log("Launching Server");
const socket = CreateSocketListener();


//Setup game loop
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;
let testIncrement : number = 0;
setInterval(() => {
    const now = Date.now();
    //console.log("Tick")

    clientsConnections.forEach(async client => {
        //client.send(testIncrement.toString() )
        testIncrement++;
    })

}, TICK_INTERVAL);

