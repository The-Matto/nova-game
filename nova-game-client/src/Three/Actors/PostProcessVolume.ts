import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {EditorState, PlayerStatics} from "../Utility/PlayerGlobals";
import {NVScene} from "../NVScene.ts";
import {MainCamera} from "../Camera.ts";

//A trigger volume, not solid geometry - swaps the level's sky color/fog distance for custom ones
//while the player's inside it, reverting to the level's own settings on exit. Doesn't touch
//NVScene.worldSettings itself (only the live scene.background/fog), so the level's real settings
//- and what SerializeLevel saves - are never clobbered by walking through one of these. Also
//previews live in editor mode (see Tick) by tracking the free-fly camera instead of a player
//collider, so an author can just fly into it to see how it'll look.
@RegisterClass("NVPostProcessVolume")
export class NVPostProcessVolume extends NVActor {

    private bounds = new THREE.Box3();
    private playerWasInside : boolean = false;

    @EditableProperty()
    public overrideSkyColor : string = '#2b1055';

    //Matches EditorWorldSettingsPanel's own Fog Distance slider's sensitivity - without this it
    //defaults to DragNumberInput's much finer 0.1/px, making the same drag distance move this
    //value ~10x less than the base setting's slider, despite being the exact same kind of value.
    @EditableProperty({min: 0, sensitivity: 1})
    public overrideFogDistance : number = 40;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const geometry = new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z);
        const material = new THREE.MeshStandardMaterial({
            color: '#8855ff',
            transparent: true,
            opacity: 0.15,
            depthWrite: false,
        });
        this.scene = new THREE.Mesh(geometry, material);

        //Deliberately NOT added to NVScene.worldOctree - this is a trigger, not solid geometry.
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    //Only fires for real gameplay, never in editor mode (see NVActor.TryBeginPlay) - the box
    //itself is an editor-only visual aid, not something the player should see or walk "into".
    BeginPlay() {
        super.BeginPlay();
        this.scene.visible = false;
    }

    //Keeps `bounds` current after an editor move - not solid, so this never touches worldOctree,
    //but NVScene.RebuildWorldOctree() still reaches every actor after a gizmo drag.
    public RegisterCollision() {
        this.bounds.setFromObject(this.scene);
    }

    //Retry teleports the player back to the spawn point, wherever that is relative to this volume
    //- if they died mid-override, revert now rather than leaving the scene stuck on it.
    public OnPlayerRespawned() : void {
        if (this.playerWasInside) this.RevertOverride();
        this.playerWasInside = false;
    }

    //Fired by the inspector panel on every edit (see NVActor.ApplyEditableProperties/
    //EditorInspectorPanel) - re-applies immediately if the override's already active, so tweaking
    //the color/fog distance while standing inside the volume updates the world live instead of
    //only taking effect on the next enter.
    public OnEditablePropertyChanged(key : string) : void {
        super.OnEditablePropertyChanged(key);
        if (this.playerWasInside) this.ApplyOverride();
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        let isInside : boolean;
        if (EditorState.isInEditor) {
            //No player collider yet in editor mode - just the free-fly camera, which both pawn
            //types share (see Pawn.ts), so this works the same whichever's currently possessed.
            isInside = this.bounds.containsPoint(MainCamera.GetCamera().position);
        } else {
            const playerCollider = PlayerStatics.PlayerCharacter?.GetPhysicsComp().playerCollider;
            if (!playerCollider) return;

            //Check both ends of the capsule (roughly feet and head) rather than one point, so the
            //trigger is forgiving about exactly how the player is standing in it.
            isInside = this.bounds.containsPoint(playerCollider.start) || this.bounds.containsPoint(playerCollider.end);
        }

        if (isInside && !this.playerWasInside) this.ApplyOverride();
        else if (!isInside && this.playerWasInside) this.RevertOverride();

        this.playerWasInside = isInside;
    }

    private ApplyOverride() {
        NVScene.scene.background = new THREE.Color(this.overrideSkyColor);
        NVScene.scene.fog = new THREE.Fog(this.overrideSkyColor, 0, this.overrideFogDistance);
    }

    //Reapplies the level's own (untouched) settings rather than remembering what was active
    //before entering - simpler, and still correct even if this volume's own properties were
    //edited while the player was inside it.
    private RevertOverride() {
        NVScene.ApplyWorldSettings(NVScene.worldSettings);
    }
}
