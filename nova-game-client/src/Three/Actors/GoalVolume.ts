import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {EditorState, PlayerStatics} from "../Utility/PlayerGlobals";
import {LevelObjectives} from "../Gameplay/LevelObjectives";
import {GameEvents} from "../Utility/GameEvents";

//The level's end goal - a trigger volume, not solid geometry. Entering it checks LevelObjectives
//and fires a GameEvent for the UI layer to react to.
@RegisterClass("NVGoalVolume")
export class NVGoalVolume extends NVActor {

    private bounds = new THREE.Box3();
    private playerWasInside : boolean = false;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const geometry = new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z);
        const material = new THREE.MeshStandardMaterial({
            color: (descripter.properties?.color as string) ?? '#39d353',
            transparent: true,
            opacity: 0.35,
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

        if (playerIsInside && !this.playerWasInside) {
            this.OnPlayerEnter();
        }
        this.playerWasInside = playerIsInside;
    }

    private OnPlayerEnter() {
        //Objectives incomplete: just let the player walk through, no popup - they'll complete
        //it once every target's been hit.
        if (LevelObjectives.AllComplete()) {
            GameEvents.Emit('levelComplete', undefined);
        }
    }
}
