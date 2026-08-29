import {NVPawn} from "../Pawn.ts";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";

//What you fly around and build the level with: permanently free-flying, no-clip. Spawned once
//at startup and repossessed (not respawned) each time PIE stops.
@RegisterClass("NVEditorPawn")
export class NVEditorPawn extends NVPawn {

    constructor(descripter : SpawnDescriptor) {
        super(descripter);
        //Always - unlike NVPlayerPhysics's isFreeFlying toggle in the old single-pawn design,
        //this pawn only ever exists to free-fly, so it's not toggled by anything.
        this.playerPhysics.isFreeFlying = true;
    }

    Jump() {
        this.AddMovementInput("Up", 1);
    }

    Crouch(isStart : boolean) {
        if (isStart) this.AddMovementInput("Up", -1);
    }

    //No weapon in editor mode - PlayerController.HandleMouseClick routes LMB to selection
    //instead and never actually calls this, but NVPawn declares Fire abstract.
    Fire() {
    }

    //Free-flying skips checkKillY and every hazard no-ops in editor mode, so this never fires -
    //but NVPawn declares it abstract.
    PlayerDeath() {
    }
}
