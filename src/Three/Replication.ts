import {NVActor} from "./Actor.ts";


//The Actors we have in our scene that are replicated - Added by Scene on spawnActor
export const ReplicatedActors = new Map<string, unknown>();

export const ReplicatedActor = (replicateRate : number) =>
    <T extends typeof NVActor>(constructor: T): T => {
        constructor.replicates = true;
        constructor.replicateRate = replicateRate;

    }




export const ReplicatedVariable = (target: Object, propertyKey: string | symbol) => {

    const value = target.constructor as typeof NVActor;
    if (!value.replicatedProperties) value.replicatedProperties = new Set<string>();
    value.replicatedProperties.add(propertyKey.toString())
}