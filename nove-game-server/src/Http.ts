import type {IncomingMessage} from "http";

//Comfortably above LevelsApi's own 2MB+3MB caps (base64 inflates those ~33%) - just a floor so
//an oversized body can't be buffered before any endpoint-specific check runs.
const MAX_BODY_BYTES = 8 * 1024 * 1024;

//Reads a request body to completion - shared by every *Api.ts handler that accepts POST.
export function ReadBody(req : IncomingMessage) : Promise<string> {
    return new Promise((resolve, reject) => {
        let body = "";
        let bytes = 0;
        req.on("data", chunk => {
            bytes += chunk.length;
            if (bytes > MAX_BODY_BYTES) {
                req.destroy();
                reject(new Error("Request body too large"));
                return;
            }
            body += chunk;
        });
        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}
