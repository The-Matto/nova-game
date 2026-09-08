import type {IncomingMessage} from "http";
import {GetRedis} from "./Redis";

//Whether this request can be trusted as having come through our own Cloudflare proxy - anything
//else (a request straight to Railway's own public URL, bypassing Cloudflare and CF-Connecting-IP
//entirely) gets rejected outright by server.ts rather than rate-limited, since Railway's own
//infra doesn't expose a stable, trustworthy address to fall back to identifying it by. Vacuously
//true when PROXY_SHARED_SECRET isn't configured at all - i.e. local dev, not the deployed server.
export function IsTrustedRequest(req : IncomingMessage) : boolean {
    if (!process.env.PROXY_SHARED_SECRET) return true;
    return req.headers["x-proxy-secret"] === process.env.PROXY_SHARED_SECRET;
}

//Only meaningful once IsTrustedRequest has already gated the request - CF-Connecting-IP is then
//guaranteed genuine (Cloudflare's edge sets it itself, never passes through a client-supplied
//one), with X-Forwarded-For/the raw socket as fallbacks for local dev (no Cloudflare involved).
export function GetClientIp(req : IncomingMessage) : string {
    const cfIp = req.headers["cf-connecting-ip"];
    if (typeof cfIp === "string") return cfIp;

    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string") return forwardedFor.split(",")[0].trim();

    return req.socket.remoteAddress ?? "unknown";
}

//Fixed-window counter per (ip, endpoint) - INCR is atomic and the window resets itself via
//EXPIRE. Fails open (allows the request) if Redis is unavailable.
export async function IsRateLimited(ip : string, endpoint : string, limit : number, windowSeconds : number) : Promise<boolean> {
    try {
        const redis = GetRedis();
        const key = `ratelimit:${ip}:${endpoint}`;
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, windowSeconds);
        return count > limit;
    } catch {
        return false;
    }
}
