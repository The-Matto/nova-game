import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {EditorState, PlayerStatics} from "../Utility/PlayerGlobals";
import {NVScene} from "../NVScene.ts";
import {MainCamera} from "../Camera.ts";

//How long an enter/exit takes to blend, in seconds - short enough to still read as reacting to
//the player, long enough not to feel like an instant, jarring cut.
const TRANSITION_SECONDS = 1;

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

    //Blends the live scene.background/fog from whatever they currently are to a target over
    //TRANSITION_SECONDS - see StartTransition/Tick. isTransitioning false means Tick leaves the
    //scene's visuals alone entirely.
    private isTransitioning : boolean = false;
    private transitionElapsed : number = 0;
    private transitionFromColor = new THREE.Color();
    private transitionToColor = new THREE.Color();
    private transitionFromFog : number = 0;
    private transitionToFog : number = 0;

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
    //- if they died mid-override, snap back instantly rather than fading out over a respawn (and
    //rather than leaving the scene stuck on the override).
    public OnPlayerRespawned() : void {
        if (this.playerWasInside) {
            this.isTransitioning = false;
            NVScene.ApplyWorldSettings(NVScene.worldSettings);
        }
        this.playerWasInside = false;
    }

    //Fired by the inspector panel on every edit (see NVActor.ApplyEditableProperties/
    //EditorInspectorPanel) - snaps to the new value immediately if the override's already active,
    //rather than blending, so tuning the color/fog distance while standing inside reads as direct
    //feedback instead of chasing a moving target.
    public OnEditablePropertyChanged(key : string) : void {
        super.OnEditablePropertyChanged(key);
        if (!this.playerWasInside) return;

        this.isTransitioning = false;
        NVScene.scene.background = new THREE.Color(this.overrideSkyColor);
        NVScene.scene.fog = new THREE.Fog(this.overrideSkyColor, 0, this.overrideFogDistance);
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

        if (isInside && !this.playerWasInside) this.StartTransition(this.overrideSkyColor, this.overrideFogDistance);
        else if (!isInside && this.playerWasInside) this.StartTransition(NVScene.worldSettings.skyColor, NVScene.worldSettings.fogDistance);

        this.playerWasInside = isInside;

        this.UpdateTransition(deltaTime);
    }

    //Blends from whatever the scene's actually showing right now (not necessarily this volume's
    //own previous target - could be mid-blend already, e.g. two volumes entered back to back) to
    //the new target over TRANSITION_SECONDS.
    private StartTransition(targetColorHex : string, targetFogDistance : number) {
        this.transitionFromColor.copy((NVScene.scene.background as THREE.Color | null) ?? new THREE.Color(targetColorHex));
        this.transitionToColor.set(targetColorHex);
        //This codebase only ever uses THREE.Fog (linear), never FogExp2 - which is the only other
        //thing NVScene.scene.fog could be, and doesn't have a `far` to read.
        this.transitionFromFog = NVScene.scene.fog instanceof THREE.Fog ? NVScene.scene.fog.far : targetFogDistance;
        this.transitionToFog = targetFogDistance;
        this.transitionElapsed = 0;
        this.isTransitioning = true;
    }

    private UpdateTransition(deltaTime : number) {
        if (!this.isTransitioning) return;

        this.transitionElapsed += deltaTime;
        const t = Math.min(this.transitionElapsed / TRANSITION_SECONDS, 1);

        const color = this.transitionFromColor.clone().lerp(this.transitionToColor, t);
        NVScene.scene.background = color;
        NVScene.scene.fog = new THREE.Fog(color, 0, THREE.MathUtils.lerp(this.transitionFromFog, this.transitionToFog, t));

        if (t >= 1) this.isTransitioning = false;
    }
}
