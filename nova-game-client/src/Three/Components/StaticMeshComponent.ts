import {NVComponent} from "./NVComponent.ts";
import * as THREE from "three";
import type {NVActor} from "../Actor.ts";

//Attaches a mesh to the owning actor's `scene` at an optional local offset - lets an actor be
//built from several meshes instead of one mesh as its whole `scene`.
export class StaticMeshComponent extends NVComponent {

    public readonly mesh : THREE.Mesh;

    constructor(
        owningActor : NVActor,
        geometry : THREE.BufferGeometry,
        material : THREE.Material,
        localPosition : THREE.Vector3 = new THREE.Vector3(),
    ) {
        super(owningActor);

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(localPosition);
        owningActor.scene.add(this.mesh);

        owningActor.components.add(this);
    }
}
