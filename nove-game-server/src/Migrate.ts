import {readdirSync, readFileSync} from "fs";
import {join} from "path";
import {pool} from "./Db";

//No migration framework - just numbered .sql files applied once each, tracked in a table of
//their own. Run via `npm run migrate`.
const MIGRATIONS_DIR = join(__dirname, "..", "migrations");

async function Migrate() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);

    const applied = new Set((await pool.query("SELECT name FROM _migrations")).rows.map(r => r.name));
    const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();

    for (const file of files) {
        if (applied.has(file)) continue;

        const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(sql);
            await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
            await client.query("COMMIT");
            console.log(`Applied ${file}`);
        } catch (err) {
            await client.query("ROLLBACK");
            throw new Error(`Migration ${file} failed: ${err}`);
        } finally {
            client.release();
        }
    }

    console.log("Migrations up to date.");
    await pool.end();
}

Migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
