import { WebSocketServer } from 'ws';
import {parse} from 'url'

export const clientsConnections = new Map<string, WebSocket>();

export const CreateSocketListener = () => {
    const wss = new WebSocketServer({ port: 8080 });
    wss.binaryType = 'arraybuffer';

    console.log('Start listening on port: ' + wss.address().port);
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