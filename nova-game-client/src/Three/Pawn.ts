import {NVActor} from "./Actor.ts";
import {MainCamera} from "./Camera.ts";
import type {SpawnDescriptor} from "./ClassDescripter.ts";
import {NVPlayerPhysics} from "./Components/NVPlayerPhysics.ts";
import {PlayerStatics} from "./Utility/PlayerGlobals.ts";
import {Vector2, Vector3} from "three";

export type MoveDirection = "Forward" | "Right" | "Up";

//A possessable actor - something PlayerController can drive input into. NVPlayerCharacter and
//NVEditorPawn both extend this rather than duplicating the input-gathering/physics-driving Tick.
export abstract class NVPawn extends NVActor {

    protected playerPhysics : NVPlayerPhysics = new NVPlayerPhysics(this);

    //Accumulates this frame's movement input (e.g. W + D held together) before being handed to
    //physics as a single normalized direction, so diagonal movement isn't faster than cardinal.
    private wishDirection : Vector3 = new Vector3();

    GetPhysicsComp() : NVPlayerPhysics {
        return this.playerPhysics;
    }

    constructor(descripter : SpawnDescriptor) {
        super(descripter);
        this.components.add(this.playerPhysics);
        //Both pawn types share the one camera - see MainCamera.
        this.scene = MainCamera.GetCamera();
    }

    public async Init(descripter : SpawnDescriptor){
        await super.Init(descripter);
        //Physics overwrites the camera's position from playerCollider every tick, so the
        //collider itself needs moving too, not just the camera.
        this.playerPhysics.SetSpawnLocation(descripter.location);
    }

    //Only the possessed pawn ticks - otherwise both would fight over the shared camera.
    CanCallTick() : boolean {
        return PlayerStatics.PlayerController?.GetPossessedPawn() === this;
    }

    //No-op: `scene` is the shared MainCamera, which must outlive any one pawn.
    public RemoveFromScene() : void {
    }

    Tick(_deltaTime : number) {
        //Gather this frame's input first so physics acts on it with zero latency, instead of
        //acting on last frame's input.
        this.wishDirection.set(0, 0, 0);
        PlayerStatics.PlayerController?.ProcessInput();

        //Clamp, not normalize, so a single held direction keeps full speed and only combined
        //ones (e.g. W+D) get scaled down.
        if (this.wishDirection.lengthSq() > 1) this.wishDirection.normalize();
        this.playerPhysics.SetWishDirection(this.wishDirection);

        super.Tick(_deltaTime);
    }

    AddMovementInput(moveType : MoveDirection, axisValue : number) {
        switch (moveType) {
            case "Forward": {
                const forwardVector : Vector3 = this.GetForwardVector();
                //Movement speed should stay constant regardless of camera pitch, so zero out
                //height and renormalize rather than leaving it shrunk by look angle.
                forwardVector.y = 0;
                if (forwardVector.lengthSq() > 0) forwardVector.normalize();
                this.wishDirection.addScaledVector(forwardVector, axisValue);
                break;
            }
            case "Right": {
                this.wishDirection.addScaledVector(this.GetRightVector(), axisValue);
                break;
            }
            case "Up": {
                //Only meaningful while free-flying; physics ignores wishDirection.y otherwise.
                this.wishDirection.y += axisValue;
                break;
            }
        }
    }

    AddLookInput(lookValue : Vector2) {
        MainCamera.AddCameraRotation(lookValue);
    }

    abstract Jump() : void;
    abstract Crouch(isStart : boolean) : void;
    abstract Sprint(isStart : boolean) : void;

    //LMB while not in editor mode - see PlayerController.HandleMouseClick.
    abstract Fire() : void;

    //The single entry point for any player death (KILL_Z, a hazard, ...) - see
    //NVPlayerPhysics.checkKillZ and NVPlayerCharacter.PlayerDeath.
    abstract PlayerDeath() : void;
}
