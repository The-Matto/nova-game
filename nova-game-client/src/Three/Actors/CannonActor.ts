import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";
import {EditorState, IsGameplayFrozen, IsPlayerWithinRange} from "../Utility/PlayerGlobals";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {LaserPool} from "./LaserProjectile.ts";
import {PlaySound} from "../Utility/Sound.ts";

//Distance-gated instead of true attenuation (see IsPlayerWithinRange) - close enough to hear the
//shot, not the whole level.
const SOUND_MAX_DISTANCE = 25;

//A stationary cannon that fires a pooled laser forward (see LaserProjectile.ts) every
//fireInterval seconds.
@RegisterClass("NVCannon")
export class NVCannonActor extends NVActor {

    private timeSinceLastFire : number = 0;
    //Just past the barrel's tip (+Z, matching GetForwardVector's convention) so projectiles
    //don't spawn inside its geometry.
    private static readonly MUZZLE_OFFSET = new THREE.Vector3(0, 0, 1);

    @EditableProperty({min: 0.1})
    public fireInterval : number = 2;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.scene = new THREE.Group();

        const material = new THREE.MeshStandardMaterial({color: '#4a4a4a'});
        new StaticMeshComponent(this, new THREE.BoxGeometry(0.6, 0.6, 0.6), material);

        const barrel = new StaticMeshComponent(
            this,
            new THREE.CylinderGeometry(0.15, 0.15, 0.8, 12),
            material,
            new THREE.Vector3(0, 0, 0.5),
        );
        barrel.mesh.rotation.x = Math.PI / 2;
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    public RegisterCollision() {
        NVScene.worldOctree.fromGraphNode(this.scene);
    }

    //So the cannon always fires on the same beat after a respawn, instead of carrying over
    //however far it happened to be into its cycle at the moment the player died/retried.
    public OnPlayerRespawned() : void {
        this.timeSinceLastFire = 0;
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        if (EditorState.isInEditor || IsGameplayFrozen()) return;

        this.timeSinceLastFire += deltaTime;
        if (this.timeSinceLastFire < this.fireInterval) return;
        this.timeSinceLastFire = 0;

        const muzzle = this.scene.localToWorld(NVCannonActor.MUZZLE_OFFSET.clone());
        LaserPool.Fire(muzzle, this.GetForwardVector());
        if (IsPlayerWithinRange(this.scene.position, SOUND_MAX_DISTANCE)) PlaySound('cannonFire');
    }
}
