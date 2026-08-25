import * as THREE from "three";
import {TransformControls} from "three/examples/jsm/controls/TransformControls";
import {NVScene} from "../NVScene.ts";
import type {NVActor} from "../Actor.ts";
import {NVPlayerCharacter} from "../Actors/PlayerCharacter.ts";
import {Game} from "../Game.ts";

//Click-to-select + gizmo, for editor mode. A single TransformControls instance is created
//lazily and reused/reattached on each new selection, rather than spawning a new one per click
//(the old debug "Editor" button did that, leaking one into the scene every time).
export class EditorSelection {

    private static transformControls : TransformControls | null = null;
    private static selectedActor : NVActor | null = null;

    private static GetControls() : TransformControls {
        if (!EditorSelection.transformControls) {
            const camera = NVPlayerCharacter.GetCamera().GetCamera();
            const canvas = Game.GetInstance().renderer.canvas;

            const controls = new TransformControls(camera, canvas);
            //On the persistent scene, not levelRoot - the gizmo is an editor tool, not level
            //content, so it should survive a level reload (which clears the selection anyway).
            NVScene.scene.add(controls.getHelper());
            EditorSelection.transformControls = controls;
        }
        return EditorSelection.transformControls;
    }

    //True while a gizmo handle is actively being dragged. PlayerController checks this before
    //treating a click as a new selection attempt, so starting a drag on a handle doesn't also
    //re-run picking for that same click.
    public static IsDragging() : boolean {
        return EditorSelection.transformControls?.dragging ?? false;
    }

    public static GetSelectedActor() : NVActor | null {
        return EditorSelection.selectedActor;
    }

    public static SelectActor(actor : NVActor | null) {
        EditorSelection.selectedActor = actor;
        const controls = EditorSelection.GetControls();

        if (actor) {
            controls.attach(actor.scene);
        } else {
            controls.detach();
        }
    }

    //Same as SelectActor(null), but skips lazily creating the gizmo if selection is already
    //empty and nothing has been selected yet this session - so e.g. reloading a level that was
    //never edited doesn't spawn a TransformControls instance for no reason.
    public static ClearSelection() {
        if (!EditorSelection.transformControls && !EditorSelection.selectedActor) return;
        EditorSelection.SelectActor(null);
    }

    //Raycasts from the camera through a real screen point (page coordinates, e.g. a MouseEvent's
    //clientX/clientY) and selects whichever actor's mesh is hit, if any; deselects on a miss.
    //Only level content is tested (NVScene.levelRoot), so the gizmo itself is never a pick
    //target.
    public static TryPickAtScreenPoint(clientX : number, clientY : number) {
        const canvasEl = document.getElementById('canvas');
        if (!canvasEl) return;

        const rect = canvasEl.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1,
        );

        const camera = NVPlayerCharacter.GetCamera().GetCamera();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);

        const hits = raycaster.intersectObject(NVScene.levelRoot, true);
        for (const hit of hits) {
            const actor = EditorSelection.FindOwningActor(hit.object);
            if (actor) {
                EditorSelection.SelectActor(actor);
                return;
            }
        }

        EditorSelection.SelectActor(null);
    }

    //Walks up from a raycast-hit mesh to whichever ancestor is an actor's root - actors get
    //tagged with userData.nvActor on their root Object3D when spawned (see NVScene.SpawnActor).
    private static FindOwningActor(object : THREE.Object3D) : NVActor | null {
        let current : THREE.Object3D | null = object;
        while (current) {
            if (current.userData.nvActor) return current.userData.nvActor as NVActor;
            current = current.parent;
        }
        return null;
    }
}
