//Metadata for one entry in the level browser (see LevelBrowser.tsx / LevelsApi.ts). `path` is
//where the client fetches the actual level JSON from - either a static file under
//nova-game-client/public (the seeded demo levels) or a full R2 public URL (uploaded levels, see
//UploadLevelRequest) - a plain fetch(path) works for both, no special-casing needed.
export interface LevelSummary {
    id : string;
    name : string;
    createdBy : string;
    rating : number;
    uploadedAt : string;
    path : string;
    //Optional - a level with none shown a placeholder in the browser instead.
    thumbnailUrl? : string;
}

//Body of a POST /api/levels - uploads a level built in the editor. The server stores levelData
//and the thumbnail in R2 and creates the levels row; levelData's actual shape (LevelData) is a
//client-only concept, so it's untyped here - the server only shape-checks it loosely.
export interface UploadLevelRequest {
    playerId : string;
    name : string;
    levelData : unknown;
    //A data URL (e.g. "data:image/jpeg;base64,...") - see EditorPalettePanel's canvas capture.
    thumbnailDataUrl : string;
}

//Body of a POST /api/levels/rating - 1-5, upserted per (levelId, playerId) rather than
//accumulated, so re-rating updates a player's existing score instead of skewing the average.
export interface RateLevelRequest {
    levelId : string;
    playerId : string;
    rating : number;
}

//Response of the same endpoint - the level's freshly-recomputed average, so the caller can show
//it immediately without a separate GET.
export interface RateLevelResponse {
    rating : number;
}
