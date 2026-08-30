import * as THREE from "three";
import {TransformControls} from "three/examples/jsm/controls/TransformControls";
import {NVScene} from "../NVScene.ts";
import type {NVActor} from "../Actor.ts";
import {MainCamera} from "../Camera.ts";
import {Game} from "../Game.ts";
import {GameEvents} from "../Utility/GameEvents.ts";
import {ModifierKeys} from "../../InputMaps.ts";
import {SelectionOutline} from "./SelectionOutline.ts";

type Transform = {position : THREE.Vector3, quaternion : THREE.Quaternion, scale : THREE.Vector3};

//Click-to-select + gizmo for editor mode. One TransformControls instance is created lazily and
//reused per selection, instead of leaking a new one into the scene every click. Ctrl+click adds
//to the selection - see ToggleActorInSelection and the multi-select pivot below.
export class EditorSelection {

    private static transformControls : TransformControls | null = null;
    private static selectedActors : Set<NVActor> = new Set();

    //One wireframe bounding-box outline per selected actor - simpler and more robust across
    //actor types (single mesh or a multi-component group) than a post-process outline, which
    //this project's renderer doesn't have a pipeline for anyway.
    private static readonly OUTLINE_COLOR = 0xffa500;
    private static outlineHelpers : Map<NVActor, SelectionOutline> = new Map();

    //An invisible shared origin the gizmo drives instead of a real actor whenever 2+ are
    //selected - each actor's own scene keeps its position/rotation/scale relative to this,
    //replayed live in UpdateMultiSelectDrag so the whole group moves/rotates/scales together
    //(Blender/UE style) without actually reparenting anything in the scene graph.
    private static multiSelectPivot : THREE.Object3D | null = null;
    private static dragStartPivot : Transform | null = null;
    private static dragStartActorTransforms : Map<NVActor, Transform> = new Map();

    private static GetControls() : TransformControls {
        if (!EditorSelection.transformControls) {
            const camera = MainCamera.GetCamera();
            const canvas = Game.GetInstance().renderer.canvas;

            const controls = new TransformControls(camera, canvas);
            //On the persistent scene, not levelRoot - the gizmo is an editor tool, not level
            //content, so it should survive a level reload (which clears the selection anyway).
            NVScene.scene.add(controls.getHelper());

            //Drag start: maybe duplicate (see TryDuplicateOnDrag), and snapshot for a group
            //transform. Drag end: rebuild the octree.
            controls.addEventListener('dragging-changed', (event : {value : boolean}) => {
                if (event.value) {
                    EditorSelection.TryDuplicateOnDrag();
                    EditorSelection.BeginMultiSelectDrag();
                } else {
                    EditorSelection.EndMultiSelectDrag();
                    NVScene.RebuildWorldOctree();
                }
            });

            //Fires continuously while dragging - replays the pivot's delta onto the group (if
            //multi-selected), and lets the inspector panel's Location/Rotation/Scale rows track
            //the gizmo live instead of only updating on the next selection change.
            controls.addEventListener('objectChange', () => {
                EditorSelection.UpdateMultiSelectDrag();
                GameEvents.Emit('actorTransformChanged', undefined);
            });

            EditorSelection.transformControls = controls;
        }
        return EditorSelection.transformControls;
    }

    //True while a gizmo handle is being dragged - PlayerController checks this so starting a
    //drag doesn't also re-run click-to-select picking.
    public static IsDragging() : boolean {
        return EditorSelection.transformControls?.dragging ?? false;
    }

    //Null whenever the selection is empty OR has more than one actor - the inspector panel
    //(single-actor only) relies on that to hide itself during a multi-select.
    public static GetSelectedActor() : NVActor | null {
        return EditorSelection.selectedActors.size === 1 ? [...EditorSelection.selectedActors][0] : null;
    }

    public static GetSelectedActors() : NVActor[] {
        return [...EditorSelection.selectedActors];
    }

    //Switches the gizmo between move/rotate/scale handles - see PlayerController's W/E/R binds.
    public static SetTransformMode(mode : 'translate' | 'rotate' | 'scale') {
        EditorSelection.GetControls().setMode(mode);
    }

    public static GetTransformMode() : string {
        return EditorSelection.GetControls().mode;
    }

    //UE-style Alt-drag: spawns a duplicate of every selected actor at its pre-drag spot, then
    //leaves selection alone so the gizmo keeps moving the originals.
    private static TryDuplicateOnDrag() {
        if (!ModifierKeys.isAltDown) return;
        if (EditorSelection.GetTransformMode() !== 'translate') return;

        for (const actor of EditorSelection.selectedActors) {
            NVScene.SpawnActor(actor.ToSpawnDescriptor());
        }
    }

    //Recenters the pivot on the current selection's centroid, at identity rotation/scale - both
    //UpdateMultiSelectDrag's math and a later BeginMultiSelectDrag assume it always starts a
    //drag this way.
    private static RecenterPivot() {
        if (!EditorSelection.multiSelectPivot) return;

        const centroid = new THREE.Vector3();
        for (const actor of EditorSelection.selectedActors) centroid.add(actor.scene.position);
        centroid.divideScalar(EditorSelection.selectedActors.size);

        EditorSelection.multiSelectPivot.position.copy(centroid);
        EditorSelection.multiSelectPivot.quaternion.identity();
        EditorSelection.multiSelectPivot.scale.set(1, 1, 1);
    }

    private static BeginMultiSelectDrag() {
        if (EditorSelection.selectedActors.size < 2 || !EditorSelection.multiSelectPivot) return;

        EditorSelection.dragStartPivot = {
            position: EditorSelection.multiSelectPivot.position.clone(),
            quaternion: EditorSelection.multiSelectPivot.quaternion.clone(),
            scale: EditorSelection.multiSelectPivot.scale.clone(),
        };

        EditorSelection.dragStartActorTransforms.clear();
        for (const actor of EditorSelection.selectedActors) {
            EditorSelection.dragStartActorTransforms.set(actor, {
                position: actor.scene.position.clone(),
                quaternion: actor.scene.quaternion.clone(),
                scale: actor.scene.scale.clone(),
            });
        }
    }

    //Replays the pivot's live delta onto every selected actor - each keeps its own orientation
    //and scale, just moved/revolved/scaled around the shared pivot, same as Blender/UE group
    //transforms. Only one of position/rotation/scale actually changes per gizmo mode, and the
    //pivot always starts a drag at identity rotation/scale (see RecenterPivot), so each branch
    //only needs the delta relevant to its own mode.
    private static UpdateMultiSelectDrag() {
        if (!EditorSelection.dragStartPivot || !EditorSelection.multiSelectPivot) return;

        const pivot = EditorSelection.multiSelectPivot;
        const origin = EditorSelection.dragStartPivot.position;
        const mode = EditorSelection.GetTransformMode();

        for (const [actor, start] of EditorSelection.dragStartActorTransforms) {
            if (mode === 'translate') {
                actor.scene.position.copy(start.position).add(pivot.position).sub(origin);
            } else if (mode === 'rotate') {
                const offset = start.position.clone().sub(origin).applyQuaternion(pivot.quaternion);
                actor.scene.position.copy(origin).add(offset);
                actor.scene.quaternion.copy(pivot.quaternion).multiply(start.quaternion);
            } else if (mode === 'scale') {
                const offset = start.position.clone().sub(origin).multiply(pivot.scale);
                actor.scene.position.copy(origin).add(offset);
                actor.scene.scale.copy(start.scale).multiply(pivot.scale);
            }
        }
    }

    //Clears the drag snapshot and re-centers the pivot at identity, ready for the next drag.
    private static EndMultiSelectDrag() {
        EditorSelection.dragStartPivot = null;
        EditorSelection.dragStartActorTransforms.clear();
        if (EditorSelection.selectedActors.size >= 2) EditorSelection.RecenterPivot();
    }

    //Attaches the gizmo directly to the sole actor, to the shared pivot for 2+, or detaches it
    //for none.
    private static UpdateGizmoAttachment() {
        const controls = EditorSelection.GetControls();
        const count = EditorSelection.selectedActors.size;

        if (count === 0) {
            controls.detach();
        } else if (count === 1) {
            controls.attach([...EditorSelection.selectedActors][0].scene);
        } else {
            if (!EditorSelection.multiSelectPivot) {
                EditorSelection.multiSelectPivot = new THREE.Object3D();
                NVScene.scene.add(EditorSelection.multiSelectPivot);
            }
            EditorSelection.RecenterPivot();
            controls.attach(EditorSelection.multiSelectPivot);
        }
    }

    private static NotifySelectionChanged() {
        GameEvents.Emit('actorSelectionChanged', {actor: EditorSelection.GetSelectedActor()});
    }

    //Adds/removes outline helpers to match selectedActors - call after any change to it.
    private static SyncOutlineHelpers() {
        for (const [actor, helper] of EditorSelection.outlineHelpers) {
            if (EditorSelection.selectedActors.has(actor)) continue;
            NVScene.scene.remove(helper.GetObject3D());
            helper.Dispose();
            EditorSelection.outlineHelpers.delete(actor);
        }

        for (const actor of EditorSelection.selectedActors) {
            if (EditorSelection.outlineHelpers.has(actor)) continue;
            const helper = new SelectionOutline(actor.scene, EditorSelection.OUTLINE_COLOR);
            NVScene.scene.add(helper.GetObject3D());
            EditorSelection.outlineHelpers.set(actor, helper);
        }
    }

    //Keeps every outline tracking its actor's live bounding box - call once per frame (see
    //Game.Tick) so it holds regardless of how an actor got moved (gizmo, inspector panel, ...).
    public static UpdateSelectionOutlines() {
        for (const helper of EditorSelection.outlineHelpers.values()) helper.Update();
    }

    //Plain click: replaces the whole selection with just this actor (or clears it, for null).
    public static SelectActor(actor : NVActor | null) {
        EditorSelection.selectedActors.clear();
        if (actor) EditorSelection.selectedActors.add(actor);
        EditorSelection.UpdateGizmoAttachment();
        EditorSelection.SyncOutlineHelpers();
        EditorSelection.NotifySelectionChanged();
    }

    //Ctrl+click: adds the actor to the selection, or removes it if already selected.
    public static ToggleActorInSelection(actor : NVActor) {
        if (EditorSelection.selectedActors.has(actor)) {
            EditorSelection.selectedActors.delete(actor);
        } else {
            EditorSelection.selectedActors.add(actor);
        }
        EditorSelection.UpdateGizmoAttachment();
        EditorSelection.SyncOutlineHelpers();
        EditorSelection.NotifySelectionChanged();
    }

    //Same as SelectActor(null), but skips lazily creating the gizmo if nothing's selected yet -
    //so reloading an unedited level doesn't spawn a TransformControls for no reason.
    public static ClearSelection() {
        if (!EditorSelection.transformControls && EditorSelection.selectedActors.size === 0) return;
        EditorSelection.SelectActor(null);
    }

    //Raycasts a screen point and selects whichever actor's mesh is hit - Ctrl held toggles it
    //into/out of the selection instead of replacing it. A miss clears the selection, unless
    //Ctrl's held (matches standard ctrl-click behavior - it shouldn't lose an existing group).
    //Only NVScene.levelRoot is tested, so the gizmo itself is never a pick target.
    public static TryPickAtScreenPoint(clientX : number, clientY : number, isCtrlHeld : boolean = false) {
        const canvasEl = document.getElementById('canvas');
        if (!canvasEl) return;

        const rect = canvasEl.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1,
        );

        const camera = MainCamera.GetCamera();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);

        const hits = raycaster.intersectObject(NVScene.levelRoot, true);
        for (const hit of hits) {
            const actor = EditorSelection.FindOwningActor(hit.object);
            if (actor) {
                if (isCtrlHeld) EditorSelection.ToggleActorInSelection(actor);
                else EditorSelection.SelectActor(actor);
                return;
            }
        }

        if (!isCtrlHeld) EditorSelection.SelectActor(null);
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
