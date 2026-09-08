const REQUIRED_ENV = ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_REDIRECT_URI"] as const;

export interface GitHubOAuthConfig {
    clientId : string;
    clientSecret : string;
    redirectUri : string;
}

//No persistent client object needed (unlike Google's OAuth2Client) - GitHub's flow is just plain
//fetch calls - but this still validates the env vars are actually set before anything tries to
//use them, same as R2.ts/Redis.ts's lazy pattern.
export function GetGitHubOAuthConfig() : GitHubOAuthConfig {
    for (const key of REQUIRED_ENV) {
        if (!process.env[key]) throw new Error(`${key} is not set - see CLAUDE.md's Running it section`);
    }
    return {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        redirectUri: process.env.GITHUB_REDIRECT_URI!,
    };
}
