import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {EditorState} from "../Utility/PlayerGlobals.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";

//Marks where NVPlayerCharacter spawns for Play In Editor, facing along its arrow (see
//PlayInEditor.StartPlaying). Editor-only visual; a cone stands in since THREE has no arrow mesh.
@RegisterClass("NVPlayerSpawn")
export class NVPlayerSpawn extends NVActor {

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.scene = new THREE.Group();

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: '#4fc3f7',
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
        });
        new StaticMeshComponent(this, new THREE.CapsuleGeometry(0.35, 1, 4, 8), bodyMaterial);

        const arrowMaterial = new THREE.MeshStandardMaterial({color: '#ffeb3b'});
        const arrow = new StaticMeshComponent(
            this,
            new THREE.ConeGeometry(0.15, 0.4, 8),
            arrowMaterial,
            new THREE.Vector3(0, 0.3, -0.55),
        );
        arrow.mesh.rotation.x = -Math.PI / 2;
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);
        this.scene.visible = EditorState.isInEditor;
    }
}
