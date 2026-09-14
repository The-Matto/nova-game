import * as THREE from "three";
import {NVScene} from "../NVScene.ts";
import {MainCamera} from "../Camera.ts";
import {EditorSelection} from "./EditorSelection.ts";
import type {SpawnableItem} from "./EditorPalette.ts";
import {MarkLevelDirty} from "../Utility/PlayerGlobals.ts";

//How far in front of the camera a newly spawned actor appears.
const SPAWN_DISTANCE = 4;

export class EditorSpawning {

    //Spawns an item from the editor palette a fixed distance in front of the camera, then
    //selects it (so the gizmo appears on it immediately, ready to reposition).
    public static SpawnFromPalette(item : SpawnableItem) {
        if (!NVScene.CanSpawnMoreLevelActors()) {
            console.warn("Level actor limit reached - can't spawn more.");
            return;
        }

        const camera = MainCamera.GetCamera();

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);

        const location = camera.position.clone().addScaledVector(forward, SPAWN_DISTANCE);

        const actor = NVScene.SpawnActor({
            class: item.class,
            location,
            scale: item.scale
                ? new THREE.Vector3(item.scale.x, item.scale.y, item.scale.z)
                : new THREE.Vector3(1, 1, 1),
            properties: item.properties,
        });

        EditorSelection.SelectActor(actor);
        MarkLevelDirty();
    }
}
