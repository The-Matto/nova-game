import { WebSocketServer } from 'ws';
import {parse} from 'url'

export const clientsConnections = new Map<string, WebSocket>();

export const CreateSocketListener = () => {
    const wss = new WebSocketServer({ port: 8080 });
    wss.binaryType = 'arraybuffer';
    let a = new WebSocket("ws://localhost:8080");
    clientsConnections.set("playerID", a);

    console.log('Start listening on port: ' + wss.address().port);
    wss.on('connection', (socket: WebSocket, req: { url: string; }) => {
        console.log('Client connected');
        const { query } = parse(req.url!, true);
        const playerID = query['UID'] as string;
        console.log(playerID);

        clientsConnections.set(playerID, socket);

        socket.onmessage = async event => {
            let buffer;
            console.log(Object.prototype.toString.call(event.data));
            if (event.data instanceof Blob) {
                buffer = await event.data.arrayBuffer();
            } else if (event.data instanceof ArrayBuffer) {
                buffer = event.data;
            } else {
                //console.log('Received text:', event.data);
                return;
            }

            const view = new Uint8Array(buffer);
            //console.log('Raw bytes:', view);

            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(view);
            console.log('Decoded text:', text);
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