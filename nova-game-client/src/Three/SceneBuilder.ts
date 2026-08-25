import {NVScene} from "./NVScene.ts";
import type {SpawnDescriptor} from "./ClassDescripter.ts";

export class SceneBuilder{

    //Resolves once every actor in the level JSON has been spawned.
    public readonly ready : Promise<void>;

    constructor(worldPath : string) {
        this.ready = fetch(worldPath)
            .then(res => res.json())
            .then(data => {

                data.actorsToSpawn.forEach((entry : SpawnDescriptor) => {
                    NVScene.SpawnActor(entry);
                });

            });
    }
}
