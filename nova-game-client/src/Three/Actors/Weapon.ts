import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {MainCamera} from "../Camera.ts";
import {GameEvents} from "../Utility/GameEvents.ts";
import {NVTargetActor} from "./TargetActor.ts";

//Fires a line trace from the camera on LMB - see NVPlayerCharacter.BeginPlay (spawns it) and
//PlayerController.HandleMouseClick (routes LMB outside editor mode). Never placed in level JSON.
@RegisterClass("NVWeapon")
export class NVWeapon extends NVActor {

    //TODO Make this a per-weapon property once there's more than one weapon type.
    private static readonly WEAPON_DISTANCE : number = 100;

    //TODO Debug-only - drop this once there's a real hit-reaction (e.g. a target actor flashing).
    private static readonly IMPACT_MARKER_LIFETIME_MS : number = 5000;

    //Active debug impact markers, so a mode switch (see the GameEvents subscription below) can
    //flush them all immediately instead of waiting out their timers.
    private static activeMarkers = new Set<{ mesh : THREE.Mesh, timeoutId : ReturnType<typeof setTimeout> }>();

    public Fire() {
        const camera = MainCamera.GetCamera();
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        const ray = new THREE.Ray(camera.position.clone(), direction);
        const hit = NVScene.worldOctree.rayIntersect(ray);

        if (hit && hit.distance <= NVWeapon.WEAPON_DISTANCE) {
            console.log("Weapon hit at", hit.position, "distance", hit.distance.toFixed(2));
            NVWeapon.ShowImpactMarker(hit.position);
            NVWeapon.RegisterTargetHit(hit.position);
        } else {
            console.log("Weapon fired - no hit within range");
        }
    }

    //Small margin on the bounds check below, since a trace's impact point sits exactly on the
    //target's surface and floating-point rounding could otherwise put it a hair outside.
    private static readonly HIT_BOUNDS_EPSILON : number = 0.01;

    //Finds whichever target's bounds the impact point landed in and registers the hit. Targets
    //already block the trace via world collision, so this only figures out WHICH actor was hit.
    private static RegisterTargetHit(position : THREE.Vector3) {
        for (const actor of NVScene.GetSceneActors()) {
            if (!(actor instanceof NVTargetActor)) continue;

            const bounds = actor.bounds.clone().expandByScalar(NVWeapon.HIT_BOUNDS_EPSILON);
            if (bounds.containsPoint(position)) {
                actor.RegisterHit();
                return;
            }
        }
    }

    //A small sphere at the hit point, self-removing after IMPACT_MARKER_LIFETIME_MS - lets you
    //actually see a trace landed, ahead of any real hit-reaction.
    private static ShowImpactMarker(position : THREE.Vector3) {
        const geometry = new THREE.SphereGeometry(0.08, 8, 8);
        const material = new THREE.MeshBasicMaterial({color: '#ff0033'});
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        NVScene.scene.add(marker);

        const entry = {mesh: marker, timeoutId: setTimeout(() => NVWeapon.RemoveMarker(entry), NVWeapon.IMPACT_MARKER_LIFETIME_MS)};
        NVWeapon.activeMarkers.add(entry);
    }

    private static RemoveMarker(entry : { mesh : THREE.Mesh, timeoutId : ReturnType<typeof setTimeout> }) {
        clearTimeout(entry.timeoutId);
        NVScene.scene.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        (entry.mesh.material as THREE.Material).dispose();
        NVWeapon.activeMarkers.delete(entry);
    }

    //Flushes every impact marker immediately, ahead of its own timer - see the GameEvents
    //subscription below, so markers don't linger from one mode into the other.
    public static ClearImpactMarkers() {
        for (const entry of [...NVWeapon.activeMarkers]) NVWeapon.RemoveMarker(entry);
    }
}

//Every editor/play transition, in either direction, should flush debug impact markers.
GameEvents.On('editorModeChanged', () => NVWeapon.ClearImpactMarkers());
