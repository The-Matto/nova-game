import type {NVActor} from "../Actor.ts";


export class NVComponent {

    owningActor : NVActor;
    constructor(owningActor : NVActor) {
        this.owningActor = owningActor;
    }

    //Called when component is spawned
    BeginPlay(): void {};

    EndPlay(): void {};

    TickComponent(delta : number) : void {};

}