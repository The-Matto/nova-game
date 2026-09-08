import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";
import {EditorState, IsGameplayFrozen, IsPlayerWithinRange, PlayerStatics} from "../Utility/PlayerGlobals";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {NVScene} from "../NVScene.ts";
import {PlaySound} from "../Utility/Sound.ts";

const SPIKE_GRID_SIZE = 5;
//Distance-gated instead of true attenuation (see IsPlayerWithinRange) - close enough to hear the
//mechanism, not the whole level.
const SOUND_MAX_DISTANCE = 20;

//Shared by every spike instance - one texture, loaded once from public/ (same pattern as
//NVTargetActor's TARGET_TEXTURE). Used on both the base cube and the cones.
const SPIKE_TEXTURE = new THREE.TextureLoader().load('/T_Spikes.png');

//A cube base with a 5x5 grid of cone spikes. Always solid (doubles as a platform); a trigger
//respawns the player on touch whenever extended. isTimed cycles extended/retracted, interpolated.
@RegisterClass("NVSpikeActor")
export class NVSpikeActor extends NVActor {

    private bounds = new THREE.Box3();
    //True if the player was both inside `bounds` and the spikes were dangerous last frame - not
    //just "inside", so spikes extending under a player already standing there still kill them.
    private wasDangerous : boolean = false;
    private spikeMaterial : THREE.MeshStandardMaterial;
    private spikeComponents : StaticMeshComponent[] = [];
    private baseMesh : THREE.Mesh;
    private extendedY : number = 0;
    private retractedY : number = 0;

    //0 = fully retracted, 1 = fully extended - see Tick/UpdateExtension.
    private extension : number = 1;
    private cycleTime : number = 0;
    //Which leg of the cycle UpdateExtension computed last frame - compared each frame so the
    //extend/retract sound plays once per transition, not every frame while it's happening.
    private lastPhase : 'up' | 'goingDown' | 'down' | 'goingUp' = 'up';

    //Counts up from BeginPlay - compared against startDelay each Tick (not snapshotted once,
    //since startDelay's real value only lands after construction - see ApplyEditableProperties).
    private timeSinceBeginPlay : number = 0;

    @EditableProperty()
    public isTimed : boolean = false;

    //A one-time delay before the cycle's very first movement, timed from BeginPlay - lets
    //otherwise-identical spikes be staggered against each other. Only ever applies once (see
    //OnPlayerRespawned) - a retry resets the cycle itself, not this initial wait.
    @EditableProperty({min: 0, editCondition: 'isTimed'})
    public startDelay : number = 0;

    //Only meaningful (and only shown) once isTimed is on - see UpdateExtension's own Math.max(0)
    //clamps, which these mirror.
    @EditableProperty({min: 0, editCondition: 'isTimed'})
    public upDuration : number = 5;

    @EditableProperty({min: 0, editCondition: 'isTimed'})
    public downDuration : number = 5;

    //Floored just above 0 rather than at it - UpdateExtension divides by this, so the UI shouldn't
    //offer a value it has to silently reinterpret.
    @EditableProperty({min: 0.01, editCondition: 'isTimed'})
    public transitionDuration : number = 1;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.scene = new THREE.Group();

        //No color/metalness - those were tinting/darkening the texture (metalness needs an
        //environment map to read as anything but near-black under this scene's plain two-light
        //setup). Just the texture, unmodified - shared by the base cube and the spikes alike.
        this.spikeMaterial = new THREE.MeshStandardMaterial({map: SPIKE_TEXTURE});
        this.baseMesh = new StaticMeshComponent(
            this,
            new THREE.BoxGeometry(descripter.scale.x, descripter.scale.y, descripter.scale.z),
            this.spikeMaterial,
        ).mesh;

        //Spikes span most of the cube's top face, leaving a small margin at the edges.
        const margin = 0.15;
        const usableWidth = descripter.scale.x * (1 - margin * 2);
        const usableDepth = descripter.scale.z * (1 - margin * 2);
        const stepX = usableWidth / (SPIKE_GRID_SIZE - 1);
        const stepZ = usableDepth / (SPIKE_GRID_SIZE - 1);

        const spikeHeight = descripter.scale.y * 0.8;
        const spikeRadius = Math.min(stepX, stepZ) * 0.35;

        //Extended: tip pokes up above the cube. Retracted: sunk back down flush with its top.
        this.extendedY = descripter.scale.y / 2 + spikeHeight / 2;
        this.retractedY = descripter.scale.y / 2 - spikeHeight / 2;

        for (let ix = 0; ix < SPIKE_GRID_SIZE; ix++) {
            for (let iz = 0; iz < SPIKE_GRID_SIZE; iz++) {
                const x = -usableWidth / 2 + ix * stepX;
                const z = -usableDepth / 2 + iz * stepZ;
                this.spikeComponents.push(new StaticMeshComponent(
                    this,
                    new THREE.ConeGeometry(spikeRadius, spikeHeight, 8),
                    this.spikeMaterial,
                    new THREE.Vector3(x, this.extendedY, z),
                ));
            }
        }

        //Not added to the world octree here - RegisterCollision() does that (called from Init()).
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();
    }

    //The base never moves (only the cones do), so this only needs registering once at spawn.
    //Always solid, even extended - danger is a separate overlap test against the spike tips.
    public RegisterCollision() {
        this.bounds.setFromObject(this.scene);
        NVScene.worldOctree.fromGraphNode(this.baseMesh);
    }

    //Restarts the cycle from its beginning (extended) on every retry, so the spikes are always
    //in the same state at the same point in a run - not startDelay's job, see its own comment.
    public OnPlayerRespawned() : void {
        this.cycleTime = 0;
        this.extension = 1;
        this.lastPhase = 'up';
    }

    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        //Covers editor mode and dead/paused/counting-down - the cycle (and any danger check
        //below) shouldn't advance while the world's otherwise frozen.
        const isFrozen = EditorState.isInEditor || IsGameplayFrozen();

        if (this.isTimed) {
            if (!isFrozen) {
                this.timeSinceBeginPlay += deltaTime;
                //Delay just holds the spikes at their default extended state - the cycle itself
                //(and cycleTime) doesn't start accumulating until it's elapsed.
                if (this.timeSinceBeginPlay >= this.startDelay) this.UpdateExtension(deltaTime);
            }
        } else {
            this.extension = 1;
        }

        const y = THREE.MathUtils.lerp(this.retractedY, this.extendedY, this.extension);
        for (const spike of this.spikeComponents) spike.mesh.position.y = y;

        //Only dangerous once mostly extended - lets the timer make retracted spikes safe.
        const isExtended = !this.isTimed || this.extension > 0.5;

        if (isFrozen) return;

        const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
        if (!physics) return;

        const playerCollider = physics.playerCollider;
        const playerIsInside = this.bounds.containsPoint(playerCollider.start)
            || this.bounds.containsPoint(playerCollider.end);
        const isDangerous = playerIsInside && isExtended;

        if (isDangerous && !this.wasDangerous) {
            PlayerStatics.PlayerCharacter?.PlayerDeath();
        }
        this.wasDangerous = isDangerous;
    }

    //Cycles: extended for upDuration, interpolate down over transitionDuration, retracted for
    //downDuration, interpolate up over transitionDuration, repeat.
    private UpdateExtension(deltaTime : number) {
        const up = Math.max(this.upDuration, 0);
        const down = Math.max(this.downDuration, 0);
        //Clamped above 0 so a 0 (or negative) transitionDuration can't divide by zero - it just
        //makes the interpolation phase effectively instantaneous instead.
        const transition = Math.max(this.transitionDuration, 0.0001);
        const cycleLength = up + transition + down + transition;

        this.cycleTime = (this.cycleTime + deltaTime) % cycleLength;
        let t = this.cycleTime;
        let phase : typeof this.lastPhase;

        if (t < up) {
            this.extension = 1;
            phase = 'up';
        } else if ((t -= up) < transition) {
            this.extension = 1 - t / transition;
            phase = 'goingDown';
        } else if ((t -= transition) < down) {
            this.extension = 0;
            phase = 'down';
        } else {
            this.extension = (t - down) / transition;
            phase = 'goingUp';
        }

        if (phase !== this.lastPhase) {
            if (phase === 'goingDown' && IsPlayerWithinRange(this.scene.position, SOUND_MAX_DISTANCE)) PlaySound('spikesRetract');
            if (phase === 'goingUp' && IsPlayerWithinRange(this.scene.position, SOUND_MAX_DISTANCE)) PlaySound('spikesExtend');
            this.lastPhase = phase;
        }
    }
}
