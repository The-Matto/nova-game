import type * as THREE from "three";
import type {NVActor} from "../Actor.ts";

//Anything NVWeapon's trace can register a hit against (see NVWeapon.RegisterShootableHit) -
//NVTargetActor and NVDeactivatableCannon's switch cube both implement this.
export interface IShootable {
    //World-space bounds the trace's impact point gets checked against - kept up to date by each
    //implementer's own RegisterCollision (also called on an editor gizmo move).
    bounds : THREE.Box3;

    RegisterHit() : void;
}

export function IsShootable(actor : NVActor) : actor is NVActor & IShootable {
    const candidate = actor as Partial<IShootable>;
    return typeof candidate.RegisterHit === 'function' && candidate.bounds !== undefined;
}
