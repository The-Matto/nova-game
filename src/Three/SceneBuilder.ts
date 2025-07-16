import {Scene} from "./Scene.ts";
import type {SpawnDescriptor} from "./ClassDescripter.ts";

export class SceneBuilder{

    constructor(worldPath : string) {
        fetch(worldPath)
            .then(res => res.json())
            .then(data => {

                data.actorsToSpawn.forEach((entry : SpawnDescriptor) => {
                    Scene.SpawnActor(entry);
                });

            });
    }
}


