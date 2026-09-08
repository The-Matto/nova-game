import type {IncomingMessage} from "http";
import {GetRedis} from "./Redis";

//Cloudflare's Pages Function proxy forwards this from the original request. X-Forwarded-For is
//only trusted alongside it when PROXY_SHARED_SECRET matches - Railway's URL is also directly,
//publicly reachable (bypassing Cloudflare/CF-Connecting-IP entirely), and X-Forwarded-For is
//otherwise just an attacker-supplied header on a direct request, defeating every rate limit.
//Falls back to the raw socket address, which a request's own headers can't spoof.
export function GetClientIp(req : IncomingMessage) : string {
    const cfIp = req.headers["cf-connecting-ip"];
    if (typeof cfIp === "string") return cfIp;

    const proxySecret = req.headers["x-proxy-secret"];
    const forwardedFor = req.headers["x-forwarded-for"];
    if (process.env.PROXY_SHARED_SECRET && proxySecret === process.env.PROXY_SHARED_SECRET && typeof forwardedFor === "string") {
        return forwardedFor.split(",")[0].trim();
    }

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
