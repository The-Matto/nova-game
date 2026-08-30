import * as THREE from "three";

//A wireframe box around an actor's live world-space bounding box. THREE.BoxHelper's own line
//width is ignored by most WebGL renderers (the same limitation NVWeapon's trace beam hit), so
//this builds the box from 12 thin strut meshes instead, which render at a real, adjustable
//thickness regardless of browser/GPU.
export class SelectionOutline {

    private static readonly THICKNESS = 0.02;

    private readonly target : THREE.Object3D;
    private readonly group = new THREE.Group();
    private readonly material : THREE.MeshBasicMaterial;
    private readonly struts : THREE.Mesh[];
    private readonly box = new THREE.Box3();

    constructor(target : THREE.Object3D, color : number) {
        this.target = target;
        this.material = new THREE.MeshBasicMaterial({color});
        this.struts = Array.from({length: 12}, () => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.material);
            this.group.add(mesh);
            return mesh;
        });

        this.Update();
    }

    public GetObject3D() : THREE.Object3D {
        return this.group;
    }

    //Repositions every strut to match the target's current world-space bounding box - call once
    //per frame so the outline tracks however the actor got moved.
    public Update() {
        this.box.setFromObject(this.target);
        const {min, max} = this.box;
        const t = SelectionOutline.THICKNESS;
        const sizeX = max.x - min.x, sizeY = max.y - min.y, sizeZ = max.z - min.z;
        const midX = (min.x + max.x) / 2, midY = (min.y + max.y) / 2, midZ = (min.z + max.z) / 2;

        let i = 0;
        //4 struts along X, at each corner of the YZ rectangle.
        for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
            this.struts[i].scale.set(sizeX + t, t, t);
            this.struts[i++].position.set(midX, y, z);
        }
        //4 struts along Y, at each corner of the XZ rectangle.
        for (const x of [min.x, max.x]) for (const z of [min.z, max.z]) {
            this.struts[i].scale.set(t, sizeY + t, t);
            this.struts[i++].position.set(x, midY, z);
        }
        //4 struts along Z, at each corner of the XY rectangle.
        for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) {
            this.struts[i].scale.set(t, t, sizeZ + t);
            this.struts[i++].position.set(x, y, midZ);
        }
    }

    public Dispose() {
        this.material.dispose();
        for (const strut of this.struts) strut.geometry.dispose();
    }
}
