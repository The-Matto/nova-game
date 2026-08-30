//Metadata for one entry in the level browser (see LevelBrowser.tsx / LevelsApi.ts). `path` is
//where the client fetches the actual level JSON from - today that's always a static file under
//nova-game-client/public, later a level-hosting endpoint of its own.
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
