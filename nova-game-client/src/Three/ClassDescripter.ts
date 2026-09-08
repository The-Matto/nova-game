
import * as THREE from "three";


export type SpawnDescriptor = {
    class: string,
    location: THREE.Vector3,
    //Euler angles in radians. Optional - omitted/existing level JSON defaults to no rotation.
    rotation?: THREE.Vector3,
    scale: THREE.Vector3,
    properties?: Record<string, unknown>
};

//Level-wide settings, as opposed to any one actor's - see NVScene.worldSettings/
//EditorWorldSettingsPanel. Optional on LevelData so existing level JSON without this still loads
//fine, defaulting to DEFAULT_WORLD_SETTINGS (see NVScene.ts).
export type WorldSettings = {
    //Hex string ("#rrggbb") - also drives fog color, matching them was already today's behavior
    //before this was configurable.
    skyColor: string,
    //UE-style "Kill Z" naming, but Y is vertical here - fall below this and respawn.
    killY: number,
    fogDistance: number,
};

//Shape of a level JSON file (see public/*.json) and of NVScene.SerializeLevel()'s in-memory
//snapshot.
export type LevelData = {
    actorsToSpawn: SpawnDescriptor[],
    worldSettings?: WorldSettings,
};

export const ClassRegistry = new Map<string, unknown>();

export function RegisterClass(name: string) {

    return function (target: unknown) {
        ClassRegistry.set(name, target);
    };
}
