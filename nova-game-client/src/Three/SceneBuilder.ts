import {NVScene} from "./NVScene.ts";
import type {LevelData} from "./ClassDescripter.ts";

export class SceneBuilder{

    //Resolves once every actor in the level JSON has been spawned.
    public readonly ready : Promise<void>;

    constructor(worldPath : string) {
        this.ready = fetch(worldPath)
            .then(res => res.json())
            .then((data : LevelData) => {
                NVScene.SpawnActorsFromData(data);
            });
    }
}
