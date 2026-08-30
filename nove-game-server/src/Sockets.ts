import { WebSocketServer } from 'ws';
import {parse} from 'url'
import type {Server} from 'http';

export const clientsConnections = new Map<string, WebSocket>();

//Shares httpServer with the REST API (see server.ts) rather than binding its own port.
export const CreateSocketListener = (httpServer : Server) => {
    const wss = new WebSocketServer({ server: httpServer });
    wss.binaryType = 'arraybuffer';

    wss.on('connection', (socket: WebSocket, req: { url: string; }) => {
        console.log('Client connected');
        const { query } = parse(req.url!, true);
        const playerID = query['UID'] as string;

        console.log(playerID);

        clientsConnections.set(playerID, socket);
        socket.send(JSON.stringify("Hello client!"));

        socket.onmessage = async event => {
            //const msg = await decodeMessage(event.data);
            console.log(event.data);

        };

        socket.onclose = async event => {
        console.log('Client disconnected');
        for (const [key, value] of clientsConnections) {
            if (value === socket) {
                clientsConnections.delete(key);
                break;
            }
        }
        };

    });
}