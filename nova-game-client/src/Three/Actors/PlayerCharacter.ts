import {NVPawn} from "../Pawn.ts";
import {RegisterClass} from "../ClassDescripter.ts";
import {ReplicatedActor, ReplicatedVariable} from "../Replication.ts";
import {NVScene} from "../NVScene.ts";
import {NVWeapon} from "./Weapon.ts";
import * as THREE from "three";

//The real gameplay pawn: gravity, collision, jumping, sprinting. Spawned fresh each PIE start
//at the level's NVPlayerSpawn marker - never placed directly in level JSON.
@RegisterClass("NVPlayerCharacter") @ReplicatedActor(12)
export class NVPlayerCharacter extends NVPawn {

    private weapon : NVWeapon | null = null;

    //Spawns the weapon and attaches it to the camera (this.scene, shared - see NVPawn), so it
    //fires from wherever the player is looking.
    BeginPlay() {
        super.BeginPlay();

        this.weapon = NVScene.SpawnActor({
            class: "NVWeapon",
            location: new THREE.Vector3(),
            scale: new THREE.Vector3(1, 1, 1),
        }) as NVWeapon;
        this.scene.add(this.weapon.scene);
    }

    BeginDestroy() {
        super.BeginDestroy();

        if (this.weapon) {
            NVScene.DestroyActor(this.weapon);
            this.weapon = null;
        }
    }

    public Fire() {
        this.weapon?.Fire();
    }

    Jump() {
        this.playerPhysics.TryJump(5);
    }

    //No gameplay crouch yet - free-fly's "descend" meaning of Crouch lives on NVEditorPawn.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Crouch(_isStart : boolean) {
    }

    Sprint(isStart : boolean) {
        this.playerPhysics.isSprinting = isStart;
    }

    @ReplicatedVariable
    playerRepTest : boolean = false;
}
