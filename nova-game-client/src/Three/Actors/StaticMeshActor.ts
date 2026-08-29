import {NVActor} from "../Actor.ts";

import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {AssetManager} from "../Utility/AssetManager.ts";
import {ReplicatedActor, ReplicatedVariable} from "../Replication.ts";
import {EditableProperty} from "../Editor/EditableProperty.ts";

//import {OctreeHelper} from "three/examples/jsm/helpers/OctreeHelper";

//Three.js's built-in primitive geometries - shown as a dropdown in the inspector (like Unreal's
//Static Mesh picker), ignored if a modelPath was given instead (see the constructor).
const SHAPE_CHOICES = [
    'cube', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'circle', 'ring',
    'dodecahedron', 'icosahedron', 'octahedron', 'tetrahedron', 'capsule',
];

@RegisterClass("NVStaticMeshActor") @ReplicatedActor(51)
export class NVStaticMeshActor extends NVActor{

    @EditableProperty({choices: SHAPE_CHOICES})
    public shape : string = 'cube';

    //Only set for the primitive-mesh path below (null for a loaded model) - lets
    //OnEditablePropertyChanged swap the geometry when `shape` changes.
    private mesh : THREE.Mesh | null = null;

    Tick(_deltaTime: number) {
        super.Tick(_deltaTime);

       // console.log(NVStaticMeshActor.replicatedProperties);
    }
    constructor(descripter : SpawnDescriptor) {
        super(descripter);


        if (!descripter.properties?.modelPath) {
            //"properties": { "color": "#rrggbb" } overrides the default per-actor.
            const color = (descripter.properties?.color as string) ?? '#c79b9b';
            const material = new THREE.MeshStandardMaterial({color});
            this.mesh = new THREE.Mesh(NVStaticMeshActor.CreateGeometry(this.shape, descripter.scale), material);
            this.scene = this.mesh;
            //Not registered with worldOctree here - the mesh is still at the origin until
            //Init() below runs SetWorldLocation.

            //Debug view for the box Collision
            //const helper = new OctreeHelper(Scene.worldOctree);
            //helper.visible = true;
            //Scene.scene.add(helper);
        }
       // Scene.AddSceneActor(this);


    }

    public OnEditablePropertyChanged(key : string) {
        if (key !== 'shape' || !this.mesh) return;

        this.mesh.geometry.dispose();
        this.mesh.geometry = NVStaticMeshActor.CreateGeometry(this.shape, this.scene.scale);
        NVScene.RebuildWorldOctree();
    }

    private static CreateGeometry(shape : string, scale : THREE.Vector3) : THREE.BufferGeometry {
        switch (shape) {
            case 'sphere': return new THREE.SphereGeometry(scale.x / 2, 24, 16);
            case 'cylinder': return new THREE.CylinderGeometry(scale.x / 2, scale.x / 2, scale.y, 24);
            case 'cone': return new THREE.ConeGeometry(scale.x / 2, scale.y, 24);
            case 'torus': return new THREE.TorusGeometry(scale.x / 2, scale.y / 4, 16, 32);
            case 'plane': return new THREE.PlaneGeometry(scale.x, scale.y);
            case 'circle': return new THREE.CircleGeometry(scale.x / 2, 32);
            case 'ring': return new THREE.RingGeometry(scale.x / 4, scale.x / 2, 32);
            case 'dodecahedron': return new THREE.DodecahedronGeometry(scale.x / 2);
            case 'icosahedron': return new THREE.IcosahedronGeometry(scale.x / 2);
            case 'octahedron': return new THREE.OctahedronGeometry(scale.x / 2);
            case 'tetrahedron': return new THREE.TetrahedronGeometry(scale.x / 2);
            case 'capsule': return new THREE.CapsuleGeometry(scale.x / 2, scale.y, 4, 16);
            default: return new THREE.BoxGeometry(scale.x, scale.y, scale.z);
        }
    }

    private async LoadModel(modelPath : string)  {
        this.scene = await AssetManager.RequestModel(modelPath);
        //Re-tag: SpawnActor tagged the old placeholder before this swapped `scene` out for the
        //loaded model, so EditorSelection couldn't otherwise walk up from a click on it.
        this.scene.userData.nvActor = this;
        //levelRoot, not scene directly, so this gets torn down along with everything else on
        //NVScene.ReloadLevel().
        NVScene.levelRoot.add(this.scene);
    }

    public async Init(descripter : SpawnDescriptor){

        if (descripter.properties?.modelPath) {
            await this.LoadModel(descripter.properties?.modelPath.toString())
        }
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();

    }

    //TODO: Would be cool to support a system like UCX from Unreal for custom collision shapes.
    public RegisterCollision() {
        NVScene.worldOctree.fromGraphNode(this.scene);
    }

   @ReplicatedVariable
   repTest : number = 20;

}
