import type {IncomingMessage} from "http";
import {GetRedis} from "./Redis";

//Cloudflare's Pages Function proxy forwards this from the original request; the other two are
//fallbacks for anything not behind that (local dev, direct-to-Railway).
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
