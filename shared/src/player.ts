//Body of a POST /api/players - registers a new anonymous player. No auth yet (see CLAUDE.md);
//this just mints a stable server-side id for a client-chosen display name.
export interface RegisterPlayerRequest {
    displayName : string;
}

export interface PlayerIdentityDto {
    id : string;
    displayName : string;
}
