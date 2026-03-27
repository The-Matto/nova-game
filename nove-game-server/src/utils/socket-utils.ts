



 const  decodeMessage
    = async (message : string | ArrayBuffer | Blob=>  {
    let buffer;
    //console.log(Object.prototype.toString.call(message.data));
    if (message instanceof Blob) {
        buffer = await message.arrayBuffer();
    } else if (message instanceof ArrayBuffer) {
        buffer = message;
    } else {
        //console.log('Received text:', message.data);
        return message;
    }

    const view = new Uint8Array(buffer);
    //console.log('Raw bytes:', view);

    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(view);
    //console.log('Decoded text:', text);
    return text;
}