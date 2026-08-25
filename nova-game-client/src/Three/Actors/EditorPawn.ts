import {NVPawn} from "../Pawn.ts";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";

//What you fly around and build the level with in editor mode: permanently free-flying, no-clip.
//Spawned once at startup (see PlayInEditor.Initialize) and never destroyed - it's repossessed
//each time the player stops Playing In Editor, rather than being respawned.
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Sprint(_isStart : boolean) {
        //TODO Could speed up flying while held, matching gameplay sprint. No-op for now.
    }
}
