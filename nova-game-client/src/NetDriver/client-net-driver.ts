import {decodeBufferMessage, encodeBufferMessage} from "nova-shared/array-buffer-handler";


export class ClientNetDriver {

    createdSocket : WebSocket = new WebSocket('ws://localhost:8080/game?UID=41');

     CreateSocket = () => {

         this.createdSocket.binaryType = 'arraybuffer';
         this.createdSocket.onopen = () => {
            console.log('Connected to server');
             this.createdSocket.send('Hello from client!');
        };

         this.createdSocket.onmessage = event => {
            console.log(event.data);

            encodeBufferMessage(event.data);
            decodeBufferMessage(event.data);
        };

         this.createdSocket.onclose = () => {
            console.log('Disconnected');
        };

         this.createdSocket.onerror = error => {
            console.error('WebSocket error:', error);
        };
    }

}