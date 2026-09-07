import IORedis from "ioredis";

//Lazily built on first use, same reasoning as R2.ts - a dev machine without REDIS_URL set can
//still run everything that doesn't touch Redis (Postgres alone still serves every request).
let client : IORedis | null = null;

export function GetRedis() : IORedis {
    if (client) return client;
    if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not set - see CLAUDE.md's Running it section");

    //Fails fast (instead of ioredis's default of queuing/retrying forever) so callers' Postgres
    //fallback actually kicks in - the "error" listener just stops the default console spam.
    client = new IORedis(process.env.REDIS_URL, {maxRetriesPerRequest: 1, commandTimeout: 2000});
    client.on("error", () => {});
    return client;
}
