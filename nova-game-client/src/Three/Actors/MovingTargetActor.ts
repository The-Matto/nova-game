import {NVTargetActor} from "./TargetActor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {EditorState, IsGameplayFrozen} from "../Utility/PlayerGlobals";

//A target that continuously lerps back and forth between its spawn location and spawn + offset -
//everything else (shootable bounds, hit reaction, goal-objective registration) is inherited from
//NVTargetActor unchanged. Unlike the base target, this one is never solid - rebuilding world
//collision every frame for something that moves constantly isn't worth it, and a target blocking
//the player mid-flight isn't the point anyway; only its shootable trigger bounds are kept live.
@RegisterClass("NVMovingTargetActor")
export class NVMovingTargetActor extends NVTargetActor {

    //Captured once at spawn - see Init. The lerp runs between this and this + offset, not
    //between two absolute world points, so moving the actor in the editor moves the whole path.
    private spawnLocation = new THREE.Vector3();

    @EditableProperty()
    public offset : THREE.Vector3 = new THREE.Vector3(2, 0, 0);

    @EditableProperty({min: 0.1})
    public cycleDuration : number = 2;

    //Drives the lerp - see Tick. Reset (not just frozen) whenever gameplay stops, so the target
    //is always found at its spawn point the instant you pause or retry, not wherever it happened
    //to be mid-swing.
    private age : number = 0;
    private wasFrozen : boolean = true;

    public async Init(descripter : SpawnDescriptor) {
        await super.Init(descripter);
        this.spawnLocation.copy(this.scene.position);
    }

    //Only the shootable trigger bounds - see the class comment for why this never touches the
    //world octree, unlike NVTargetActor's own RegisterCollision.
    public RegisterCollision() {
        this.bounds.setFromObject(this.scene);
    }

    public OnPlayerRespawned() : void {
        super.OnPlayerRespawned();
        this.age = 0;
        this.scene.position.copy(this.spawnLocation);
        this.RegisterCollision();
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        const isFrozen = EditorState.isInEditor || IsGameplayFrozen();

        //The instant gameplay stops for any reason (pause, death, countdown, editor) - not just
        //on an explicit retry - snap back to the spawn point rather than freezing mid-swing.
        if (isFrozen) {
            if (!this.wasFrozen) {
                this.age = 0;
                this.scene.position.copy(this.spawnLocation);
                this.RegisterCollision();
            }
            this.wasFrozen = true;
            return;
        }
        this.wasFrozen = false;

        this.age += deltaTime;
        const frequency = (2 * Math.PI) / this.cycleDuration;
        //Remaps sin's -1..1 into a smooth 0..1 back-and-forth, same easing feel as
        //NVMovingBladeActor's sweep.
        const t = (Math.sin(this.age * frequency) + 1) / 2;
        const targetLocation = this.spawnLocation.clone().add(this.offset);
        this.scene.position.lerpVectors(this.spawnLocation, targetLocation, t);

        this.RegisterCollision();
    }
}
