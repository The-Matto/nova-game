import {pool} from "./Db";
import {ANONYMOUS_ACCOUNT_GRACE_PERIOD_DAYS} from "./AccountLifetime";

//Anonymous accounts (claimed_at still null - see 0006_anonymous_player_cleanup.sql) get wiped
//after this long. Their leaderboard entries cascade with them; any level they uploaded survives
//with author_id set to null instead.
async function CleanupAnonymousUsers() {
    const result = await pool.query(
        "DELETE FROM users WHERE claimed_at IS NULL AND created_at < now() - make_interval(days => $1)",
        [ANONYMOUS_ACCOUNT_GRACE_PERIOD_DAYS],
    );
    console.log(`Deleted ${result.rowCount} anonymous user(s) older than ${ANONYMOUS_ACCOUNT_GRACE_PERIOD_DAYS} days.`);
    await pool.end();
}

CleanupAnonymousUsers().catch(err => {
    console.error(err);
    process.exit(1);
});
