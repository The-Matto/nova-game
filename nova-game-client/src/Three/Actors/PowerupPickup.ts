import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {EditorState, PlayerStatics} from "../Utility/PlayerGlobals";

//The full set of abilities this pickup can grant - add a new one here, give it its own
//`isXAbility` getter + editCondition-gated properties below, and a new case in ApplyAbility.
const POWERUP_TYPES = ['Gravity'] as const;
type PowerupType = typeof POWERUP_TYPES[number];

//One glow color per type, so different pickups read apart at a glance before you even touch one.
const POWERUP_COLORS : Record<PowerupType, string> = {
    Gravity: '#7c5cff',
};

const BOB_HEIGHT = 0.15;
const BOB_SPEED = 2;
const SPIN_SPEED = 1.5;

//A trigger volume, not solid geometry - grants a temporary ability on touch, then hides itself
//until the next respawn (same "reset per attempt" pattern as NVTargetActor). Which ability, and
//that ability's own settings, are picked via powerupType + conditional properties below.
@RegisterClass("NVPowerupPickup")
export class NVPowerupPickup extends NVActor {

    private bounds = new THREE.Box3();
    private material : THREE.MeshStandardMaterial;
    private hasBeenCollected : boolean = false;
    private age : number = 0;
    //The mesh's own local Y before any bob offset is applied - bob adds/subtracts around this,
    //rather than drifting from accumulating onto a moving base each frame.
    private restY : number = 0;

    @EditableProperty({choices: [...POWERUP_TYPES]})
    public powerupType : PowerupType = 'Gravity';

    @EditableProperty({min: 0.1})
    public abilityDuration : number = 5;

    //Gravity ability - see NVPlayerPhysics.ApplyGravityOverride. Default matches the player's
    //own normal GRAVITY, so an untouched pickup doesn't silently do nothing.
    @EditableProperty({min: 0, editCondition: 'isGravityAbility'})
    public gravityValue : number = 4;

    //Not @EditableProperty itself - just a computed check other properties' editCondition can
    //point at (see EditablePropertyOptions/GetEditableProperties). Public so it's not flagged as
    //an unused private member - it's only ever read reflectively, by key, from there.
    public get isGravityAbility() : boolean {
        return this.powerupType === 'Gravity';
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
        this.scene = new THREE.Mesh(geometry, this.material);

        //Not added to NVScene.worldOctree - this is a trigger, not solid geometry.
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.restY = this.scene.position.y;
        this.RegisterCollision();
    }

    //Keeps `bounds` current after an editor move - not solid, so this never touches worldOctree,
    //but NVScene.RebuildWorldOctree() still reaches every actor after a gizmo drag.
    public RegisterCollision() {
        this.bounds.setFromObject(this.scene);
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

        this.age += deltaTime;
        this.scene.rotation.y += SPIN_SPEED * deltaTime;
        this.scene.position.y = this.restY + Math.sin(this.age * BOB_SPEED) * BOB_HEIGHT;

        //Trigger volumes are gameplay-only - editor mode is for inspecting/moving around the
        //level, not playing it.
        if (EditorState.isInEditor || this.hasBeenCollected) return;

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
        const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
        if (!physics) return;

        switch (this.powerupType) {
            case 'Gravity':
                physics.ApplyGravityOverride(this.gravityValue, this.abilityDuration);
                break;
        }
    }
}
