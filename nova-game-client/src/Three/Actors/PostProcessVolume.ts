import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {EditorState, PlayerStatics} from "../Utility/PlayerGlobals";
import {NVScene} from "../NVScene.ts";

//A trigger volume, not solid geometry - swaps the level's sky color/fog distance for custom ones
//while the player's inside it, reverting to the level's own settings on exit. Doesn't touch
//NVScene.worldSettings itself (only the live scene.background/fog), so the level's real settings
//- and what SerializeLevel saves - are never clobbered by walking through one of these.
@RegisterClass("NVPostProcessVolume")
export class NVPostProcessVolume extends NVActor {

    private bounds = new THREE.Box3();
    private playerWasInside : boolean = false;

    @EditableProperty()
    public overrideSkyColor : string = '#2b1055';

    @EditableProperty({min: 0})
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

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        //Trigger volumes are gameplay-only - editor mode is for inspecting/moving around the
        //level, not playing it.
        if (EditorState.isInEditor) return;

        const playerCollider = PlayerStatics.PlayerCharacter?.GetPhysicsComp().playerCollider;
        if (!playerCollider) return;

        //Check both ends of the capsule (roughly feet and head) rather than one point, so the
        //trigger is forgiving about exactly how the player is standing in it.
        const playerIsInside = this.bounds.containsPoint(playerCollider.start)
            || this.bounds.containsPoint(playerCollider.end);

        if (playerIsInside && !this.playerWasInside) this.ApplyOverride();
        else if (!playerIsInside && this.playerWasInside) this.RevertOverride();

        this.playerWasInside = playerIsInside;
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
