//Response of GET /api/auth/me - id/displayName/email are only present when loggedIn is true.
export interface AuthMeResponse {
    loggedIn : boolean;
    id? : string;
    displayName? : string;
    email? : string;
}
