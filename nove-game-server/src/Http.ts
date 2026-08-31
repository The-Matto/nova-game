import type {IncomingMessage} from "http";

//Reads a request body to completion - shared by every *Api.ts handler that accepts POST.
export function ReadBody(req : IncomingMessage) : Promise<string> {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}
