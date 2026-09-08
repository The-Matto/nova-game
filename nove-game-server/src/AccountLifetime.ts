//Shared between CleanupAnonymousUsers.ts (the actual sweep) and PlayersApi.ts (surfacing the
//deadline to the client) - one place so they can't drift out of sync.
export const ANONYMOUS_ACCOUNT_GRACE_PERIOD_DAYS = 7;
