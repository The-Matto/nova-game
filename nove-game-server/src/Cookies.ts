import type {IncomingMessage} from "http";

export function GetCookie(req : IncomingMessage, name : string) : string | null {
    const header = req.headers.cookie;
    if (!header) return null;

    for (const pair of header.split(";")) {
        const eq = pair.indexOf("=");
        if (eq === -1) continue;
        if (pair.slice(0, eq).trim() === name) return decodeURIComponent(pair.slice(eq + 1).trim());
    }
    return null;
}

//Secure is conditional on the request actually being HTTPS - Railway/Cloudflare mark this via
//x-forwarded-proto, but a plain local http://localhost dev server can't set a Secure cookie.
export function BuildSetCookie(req : IncomingMessage, name : string, value : string, maxAgeSeconds : number) : string {
    const isHttps = req.headers["x-forwarded-proto"] === "https";
    const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSeconds}`];
    if (isHttps) parts.push("Secure");
    return parts.join("; ");
}

export function BuildClearCookie(req : IncomingMessage, name : string) : string {
    return BuildSetCookie(req, name, "", 0);
}
