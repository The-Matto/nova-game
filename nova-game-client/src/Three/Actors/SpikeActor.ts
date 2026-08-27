import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";
import {EditorState, PlayerStatics} from "../Utility/PlayerGlobals";

const SPIKE_GRID_SIZE = 5;

//A cube base with a 5x5 grid of cone spikes on top - a trigger, not solid geometry, that
//respawns the player on touch (same as KILL_Z).
@RegisterClass("NVSpikeActor")
export class NVSpikeActor extends NVActor {

    private bounds = new THREE.Box3();
    private playerWasInside : boolean = false;
    private spikeMaterial : THREE.MeshStandardMaterial;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.scene = new THREE.Group();

        const baseMaterial = new THREE.MeshStandardMaterial({color: '#2b2b2b'});
        new StaticMeshComponent(
            this,
            new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z),
            baseMaterial,
        );

        //Spikes span most of the cube's top face, leaving a small margin at the edges.
        const margin = 0.15;
        const usableWidth = descripter.scale.x * (1 - margin * 2);
        const usableDepth = descripter.scale.z * (1 - margin * 2);
        const stepX = usableWidth / (SPIKE_GRID_SIZE - 1);
        const stepZ = usableDepth / (SPIKE_GRID_SIZE - 1);

        const spikeHeight = descripter.scale.y * 0.8;
        const spikeRadius = Math.min(stepX, stepZ) * 0.35;
        this.spikeMaterial = new THREE.MeshStandardMaterial({color: '#8a8f99', metalness: 0.6, roughness: 0.4});
        const spikeY = descripter.scale.y / 2 + spikeHeight / 2;

        for (let ix = 0; ix < SPIKE_GRID_SIZE; ix++) {
            for (let iz = 0; iz < SPIKE_GRID_SIZE; iz++) {
                const x = -usableWidth / 2 + ix * stepX;
                const z = -usableDepth / 2 + iz * stepZ;
                new StaticMeshComponent(
                    this,
                    new THREE.ConeGeometry(spikeRadius, spikeHeight, 8),
                    this.spikeMaterial,
                    new THREE.Vector3(x, spikeY, z),
                );
            }
        }

        //Deliberately not added to NVScene.worldOctree - a trigger, not solid geometry.
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    //No real collision - just keeps `bounds` current after an editor move.
    public RegisterCollision() {
        this.bounds.setFromObject(this.scene);
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        //Hazards are gameplay-only
        if (EditorState.isInEditor) return;

        const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
        if (!physics) return;

        const playerCollider = physics.playerCollider;
        const playerIsInside = this.bounds.containsPoint(playerCollider.start)
            || this.bounds.containsPoint(playerCollider.end);

        if (playerIsInside && !this.playerWasInside) {
            physics.RespawnAtSpawnPoint();
        }
        this.playerWasInside = playerIsInside;
    }
}
