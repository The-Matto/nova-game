import {NVCannonActor} from "./CannonActor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {EditorState, IsGameplayFrozen} from "../Utility/PlayerGlobals";
import type {IShootable} from "../Gameplay/Shootable.ts";

//A red switch cube mounted on top of a regular cannon - shooting it deactivates the cannon (stops
//it firing, not just hides it) for deactivateDuration seconds. Reuses NVCannonActor's body/
//barrel/firing entirely via the CanFire() hook rather than duplicating any of it.
@RegisterClass("NVDeactivatableCannon")
export class NVDeactivatableCannon extends NVCannonActor implements IShootable {

    private static readonly SWITCH_SIZE = 0.3;
    //Sits just above the cannon's 0.6-tall body.
    private static readonly SWITCH_OFFSET = new THREE.Vector3(0, 0.55, 0);
    private static readonly ACTIVE_GLOW = 0.6;

    @EditableProperty({min: 0.1})
    public deactivateDuration : number = 5;

    private deactivatedRemaining : number = 0;
    private readonly switchMaterial : THREE.MeshStandardMaterial;
    private readonly switchMesh : THREE.Mesh;

    //Kept up to date by RegisterCollision - NVWeapon bounds-checks a trace's impact point against
    //this, same pattern as NVTargetActor.bounds.
    public bounds = new THREE.Box3();

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.switchMaterial = new THREE.MeshStandardMaterial({
            color: '#ff2222',
            emissive: '#ff2222',
            emissiveIntensity: NVDeactivatableCannon.ACTIVE_GLOW,
        });
        this.switchMesh = new THREE.Mesh(
            new THREE.BoxGeometry(NVDeactivatableCannon.SWITCH_SIZE, NVDeactivatableCannon.SWITCH_SIZE, NVDeactivatableCannon.SWITCH_SIZE),
            this.switchMaterial,
        );
        this.switchMesh.position.copy(NVDeactivatableCannon.SWITCH_OFFSET);
        this.scene.add(this.switchMesh);
    }

    //Adds the switch cube's own trigger volume on top of the cannon body's usual solid collision.
    public RegisterCollision() {
        super.RegisterCollision();
        this.bounds.setFromObject(this.switchMesh);
    }

    public RegisterHit() {
        this.deactivatedRemaining = this.deactivateDuration;
        this.switchMaterial.emissiveIntensity = 0;
    }

    protected CanFire() : boolean {
        return this.deactivatedRemaining <= 0;
    }

    //A mid-effect deactivation shouldn't carry over into a fresh attempt - same reasoning as
    //NVPlayerPhysics.RespawnAtSpawnPoint's powerup reverts.
    public OnPlayerRespawned() : void {
        super.OnPlayerRespawned();
        this.deactivatedRemaining = 0;
        this.switchMaterial.emissiveIntensity = NVDeactivatableCannon.ACTIVE_GLOW;
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        if (EditorState.isInEditor || IsGameplayFrozen() || this.deactivatedRemaining <= 0) return;
        this.deactivatedRemaining = Math.max(0, this.deactivatedRemaining - deltaTime);
        if (this.deactivatedRemaining <= 0) this.switchMaterial.emissiveIntensity = NVDeactivatableCannon.ACTIVE_GLOW;
    }
}
