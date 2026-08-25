
import * as THREE from "three";


export type SpawnDescriptor = {
    class: string,
    location: THREE.Vector3,
    scale: THREE.Vector3,
    properties?: Record<string, unknown>
};

//Shape of a level JSON file (see public/*.json) and of NVScene.SerializeLevel()'s in-memory
//snapshot.
export type LevelData = {
    actorsToSpawn: SpawnDescriptor[],
};

export const ClassRegistry = new Map<string, unknown>();

export function RegisterClass(name: string) {

    return function (target: unknown) {
        ClassRegistry.set(name, target);
    };
}
