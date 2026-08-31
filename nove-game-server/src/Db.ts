import {Pool} from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set - see CLAUDE.md's Running it section");

//Railway's Postgres requires SSL even for a plain dev connection to it (there's no local
//instance - see CLAUDE.md), so this is unconditional rather than NODE_ENV-gated.
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {rejectUnauthorized: false},
});
