import {NVPawn} from "../Pawn.ts";
import {RegisterClass} from "../ClassDescripter.ts";
import {ReplicatedActor, ReplicatedVariable} from "../Replication.ts";

//The real gameplay pawn: gravity, collision, jumping, sprinting. Spawned fresh each time the
//player starts Playing In Editor (see PlayInEditor.StartPlaying), at wherever the level's
//NVPlayerSpawn marker is - never placed directly in level JSON.
@RegisterClass("NVPlayerCharacter") @ReplicatedActor(12)
export class NVPlayerCharacter extends NVPawn {

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
