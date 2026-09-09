import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {EditorState, PlayerStatics} from "../Utility/PlayerGlobals";

//The full set of abilities this pickup can grant - add a new one here, give it its own
//`isXAbility` getter + editCondition-gated properties below, and a new case in ApplyAbility.
const POWERUP_TYPES = ['Gravity', 'Speed', 'FastFire'] as const;
type PowerupType = typeof POWERUP_TYPES[number];

//One glow color per type, so different pickups read apart at a glance before you even touch one.
const POWERUP_COLORS : Record<PowerupType, string> = {
    Gravity: '#7c5cff',
    Speed: '#3de0ff',
    FastFire: '#ff5533',
};

const BOB_HEIGHT = 0.15;
const BOB_SPEED = 2;
const SPIN_SPEED = 1.5;

//A trigger volume, not solid geometry - grants a temporary ability on touch, then hides itself
//until the next respawn (same "reset per attempt" pattern as NVTargetActor). Which ability, and
//that ability's own settings, are picked via powerupType + conditional properties below.
@RegisterClass("NVPowerupPickup")
export class NVPowerupPickup extends NVActor {

    //The trigger volume - fixed to wherever this actor is actually placed (see RegisterCollision),
    //deliberately never touched by the bob below. Standing in the pickup felt inconsistent because
    //this used to be derived from the bobbing mesh itself (setFromObject), so the volume drifted
    //up and down a frame behind whatever position the player was actually checked against.
    private bounds = new THREE.Box3();
    //The bob/spin only ever move this, a child of `scene` - `scene`'s own position/rotation is
    //the level author's placement and is never touched after spawn, so the trigger volume above
    //can just be computed once from it and stay correct forever.
    private visualMesh : THREE.Mesh;
    private material : THREE.MeshStandardMaterial;
    private hasBeenCollected : boolean = false;
    private age : number = 0;

    @EditableProperty({choices: [...POWERUP_TYPES]})
    public powerupType : PowerupType = 'Gravity';

    @EditableProperty({min: 0.1})
    public abilityDuration : number = 5;

    //Gravity ability - see NVPlayerPhysics.ApplyGravityOverride. Default matches the player's
    //own normal GRAVITY, so an untouched pickup doesn't silently do nothing.
    @EditableProperty({min: 0, editCondition: 'isGravityAbility'})
    public gravityValue : number = 4;

    //Speed ability - see NVPlayerPhysics.ApplyWalkSpeedOverride. Default matches the player's own
    //normal walk speed, same reasoning as gravityValue's default above.
    @EditableProperty({min: 0, editCondition: 'isSpeedAbility'})
    public speedValue : number = 10;

    //Fast fire ability - see NVWeapon.ApplyFireRateOverride. Shots/second; well above the
    //weapon's own default (4) so an untouched pickup is obviously "fast fire".
    @EditableProperty({min: 0.1, editCondition: 'isFastFireAbility'})
    public fireRateValue : number = 12;

    //Not @EditableProperty themselves - just computed checks other properties' editCondition can
    //point at (see EditablePropertyOptions/GetEditableProperties). Public so they're not flagged
    //as unused private members - they're only ever read reflectively, by key, from there.
    public get isGravityAbility() : boolean {
        return this.powerupType === 'Gravity';
    }

    public get isSpeedAbility() : boolean {
        return this.powerupType === 'Speed';
    }

    public get isFastFireAbility() : boolean {
        return this.powerupType === 'FastFire';
    }

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const radius = descripter.scale.x * 0.5;
        const geometry = new THREE.IcosahedronGeometry(radius, 0);
        const color = POWERUP_COLORS[this.powerupType];
        this.material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.6,
        });
        this.visualMesh = new THREE.Mesh(geometry, this.material);
        this.scene = new THREE.Object3D();
        this.scene.add(this.visualMesh);

        //Not added to NVScene.worldOctree - this is a trigger, not solid geometry.
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    //Sized from the placed scale rather than setFromObject(this.scene) - the mesh it'd otherwise
    //measure is the one bobbing (see Tick), so this stays a fixed volume regardless of where the
    //visual currently is. Also called on an editor gizmo move (see NVScene.RebuildWorldOctree),
    //so a live Scale edit still resizes the trigger to match - same baked-scale * live-multiplier
    //math as ToSpawnDescriptor().
    public RegisterCollision() {
        const baked = this.spawnDescriptor.scale;
        const size = new THREE.Vector3(
            baked.x * this.scene.scale.x,
            baked.y * this.scene.scale.y,
            baked.z * this.scene.scale.z,
        );
        this.bounds.setFromCenterAndSize(this.scene.position, size);
    }

    //Back for another attempt, same as NVTargetActor - a pickup used earlier in a run shouldn't
    //stay gone on retry.
    public OnPlayerRespawned() : void {
        if (!this.hasBeenCollected) return;
        this.hasBeenCollected = false;
        this.scene.visible = true;
    }

    //Re-tints for the new type - fires for both a live inspector edit and a saved level loading
    //with a non-default powerupType (see NVActor.ApplyEditableProperties), so the constructor
    //picking a color from the field's not-yet-applied default doesn't stick.
    public OnEditablePropertyChanged(key : string) : void {
        super.OnEditablePropertyChanged(key);
        if (key !== 'powerupType') return;

        const color = POWERUP_COLORS[this.powerupType];
        this.material.color.set(color);
        this.material.emissive.set(color);
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        //Bob/spin (and the trigger check below) are gameplay-only - editor mode is for
        //inspecting/moving around the level, not playing it. Both only ever touch visualMesh's
        //local transform now, never `scene`'s, so there's nothing left for this to fight a gizmo
        //drag or Location/Rotation edit over.
        if (EditorState.isInEditor) return;

        this.age += deltaTime;
        this.visualMesh.rotation.y += SPIN_SPEED * deltaTime;
        this.visualMesh.position.y = Math.sin(this.age * BOB_SPEED) * BOB_HEIGHT;

        if (this.hasBeenCollected) return;

        const playerCollider = PlayerStatics.PlayerCharacter?.GetPhysicsComp().playerCollider;
        if (!playerCollider) return;

        const playerIsInside = this.bounds.containsPoint(playerCollider.start)
            || this.bounds.containsPoint(playerCollider.end);
        if (playerIsInside) this.OnPlayerEnter();
    }

    private OnPlayerEnter() {
        this.hasBeenCollected = true;
        this.scene.visible = false;
        this.ApplyAbility();
    }

    private ApplyAbility() {
        const player = PlayerStatics.PlayerCharacter;
        if (!player) return;

        switch (this.powerupType) {
            case 'Gravity':
                player.GetPhysicsComp().ApplyGravityOverride(this.gravityValue, this.abilityDuration);
                break;
            case 'Speed':
                player.GetPhysicsComp().ApplyWalkSpeedOverride(this.speedValue, this.abilityDuration);
                break;
            case 'FastFire':
                player.GetWeapon()?.ApplyFireRateOverride(this.fireRateValue, this.abilityDuration);
                break;
        }
    }
}
