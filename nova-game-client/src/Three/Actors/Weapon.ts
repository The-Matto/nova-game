import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {MainCamera} from "../Camera.ts";
import {GameEvents} from "../Utility/GameEvents.ts";
import {IsShootable, type IShootable} from "../Gameplay/Shootable.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";
import {PlayerSettings, PlayerStatics} from "../Utility/PlayerGlobals.ts";
import {PlaySound} from "../Utility/Sound.ts";

//A momentary visual per shot (impact marker, trace beam) - see NVWeapon.UpdateEffects.
type TimedEffect = {
    object : THREE.Mesh,
    material : THREE.Material & {opacity : number},
    spawnTime : number,
    lifetimeMs : number,
    baseOpacity : number,
    fadeOut : boolean,
};

//Fires a line trace from the camera on LMB - see NVPlayerCharacter.BeginPlay (spawns it) and
//PlayerController.HandleMouseClick (routes LMB outside editor mode). Never placed in level JSON.
@RegisterClass("NVWeapon")
export class NVWeapon extends NVActor {

    //TODO Make this a per-weapon property once there's more than one weapon type.
    private static readonly WEAPON_DISTANCE : number = 100;

    //Viewmodel offset from the camera - right, down, and slightly forward, standard FPS placement.
    private static readonly VIEWMODEL_OFFSET = new THREE.Vector3(0.25, -0.25, -0.5);

    private readonly meshComponent : StaticMeshComponent;

    //How far the mesh leans at full speed, and how quickly it eases toward its target lean.
    private static readonly MAX_TILT : number = THREE.MathUtils.degToRad(12);
    private static readonly TILT_SMOOTHING : number = 8;

    //Friction decays velocity asymptotically rather than snapping to zero - below this speed,
    //treat the player as stopped so the lean eases back to neutral instead of lingering.
    private static readonly MOVEMENT_THRESHOLD : number = 5;

    //Recoil kick added to the pitch on Fire(), kept separate from the movement lean's own pitch
    //so the two don't fight over rotation.x. Stacks on rapid fire (capped at RECOIL_MAX).
    private static readonly RECOIL_KICK : number = THREE.MathUtils.degToRad(15);
    private static readonly RECOIL_MAX : number = THREE.MathUtils.degToRad(35);
    private static readonly RECOIL_RECOVERY_SPEED : number = 6;
    private movementPitch : number = 0;
    private recoilOffset : number = 0;

    //Shots/second - Fire() no-ops while cooldownRemaining hasn't reached 0 yet.
    private static readonly DEFAULT_FIRE_RATE : number = 4;
    private fireRate : number = NVWeapon.DEFAULT_FIRE_RATE;
    private cooldownRemaining : number = 0;

    //Set while a temporary fast-fire powerup is active (see ApplyFireRateOverride/
    //NVPowerupPickup) - same pattern as NVPlayerPhysics's gravity/speed overrides.
    private baseFireRate : number = this.fireRate;
    private fireRateOverrideRemaining : number = 0;
    private fireRateOverrideDuration : number = 0;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const material = new THREE.MeshStandardMaterial({color: '#2b2b2b'});
        this.meshComponent = new StaticMeshComponent(this, new THREE.BoxGeometry(0.1, 0.12, 0.4), material, NVWeapon.VIEWMODEL_OFFSET);
    }

    //Called by NVPowerupPickup - overrides the fire rate for `duration` seconds, then reverts on
    //its own (see Tick). Same pattern as NVPlayerPhysics's gravity/speed overrides.
    public ApplyFireRateOverride(value : number, duration : number) {
        if (this.fireRateOverrideRemaining <= 0) this.baseFireRate = this.fireRate;
        this.fireRate = value;
        this.fireRateOverrideRemaining = duration;
        this.fireRateOverrideDuration = duration;
    }

    private TickFireRateOverride(deltaTime : number) {
        if (this.fireRateOverrideRemaining <= 0) return;

        this.fireRateOverrideRemaining -= deltaTime;
        if (this.fireRateOverrideRemaining <= 0) this.fireRate = this.baseFireRate;
    }

    //A powerup mid-effect shouldn't carry over into a fresh attempt - same reasoning as
    //NVPlayerPhysics.RespawnAtSpawnPoint's own gravity/speed reverts.
    public OnPlayerRespawned() : void {
        if (this.fireRateOverrideRemaining <= 0) return;
        this.fireRate = this.baseFireRate;
        this.fireRateOverrideRemaining = 0;
    }

    //True only while a fast-fire powerup is active - see PlayerController.ProcessInput, which
    //holds this to "hold to keep firing" while it's true, one shot per click otherwise.
    public get isAutoFire() : boolean {
        return this.fireRateOverrideRemaining > 0;
    }

    //For ActiveAbilityDisplay (HUD) - 0 means no fast-fire powerup is currently active.
    public get fastFireSecondsRemaining() : number {
        return Math.max(0, this.fireRateOverrideRemaining);
    }

    public get fastFireFraction() : number {
        return this.fireRateOverrideDuration > 0 ? this.fastFireSecondsRemaining / this.fireRateOverrideDuration : 0;
    }

    //Leans the viewmodel (and camera) into whichever way the player's moving - purely cosmetic,
    //not physically driven.
    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaTime);
        this.TickFireRateOverride(deltaTime);

        //Horizontal only - vertical velocity (falling, jumping) never decays via friction, so
        //including it would keep the lean alive well after the player's actually stopped moving.
        const velocity = PlayerStatics.PlayerCharacter?.GetPhysicsComp().playerVelocity;
        const horizontalVelocity = velocity ? new THREE.Vector3(velocity.x, 0, velocity.z) : new THREE.Vector3();

        //normalize() is a safe no-op on a zero vector, keeping the dot products below bounded to
        //[-1,1] - speedFactor is what fades the lean out as the player slows down.
        const direction = horizontalVelocity.clone().normalize();
        const speedFactor = Math.min(1, horizontalVelocity.length() / NVWeapon.MOVEMENT_THRESHOLD);

        const strafeAmount = direction.dot(this.GetRightVector()) * speedFactor;
        const forwardAmount = direction.dot(this.GetForwardVector()) * speedFactor;

        const targetRoll = strafeAmount * NVWeapon.MAX_TILT;
        const targetPitch = forwardAmount * NVWeapon.MAX_TILT * 0.5;

        const mesh = this.meshComponent.mesh;
        const lerpFactor = Math.min(1, deltaTime * NVWeapon.TILT_SMOOTHING);
        mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, targetRoll, lerpFactor);
        this.movementPitch = THREE.MathUtils.lerp(this.movementPitch, targetPitch, lerpFactor);

        //Read live (not cached) so a slider drag in Options takes effect immediately.
        const camera = MainCamera.GetCamera();
        const targetCameraRoll = strafeAmount * THREE.MathUtils.degToRad(PlayerSettings.cameraTiltDegrees);
        MainCamera.SetRoll(THREE.MathUtils.lerp(camera.rotation.z, targetCameraRoll, lerpFactor));

        //Recoil eases back to 0 on its own, independent of the movement lean above.
        const recoilLerpFactor = Math.min(1, deltaTime * NVWeapon.RECOIL_RECOVERY_SPEED);
        this.recoilOffset = THREE.MathUtils.lerp(this.recoilOffset, 0, recoilLerpFactor);

        mesh.rotation.x = this.movementPitch + this.recoilOffset;

        NVWeapon.UpdateEffects();
    }

    //TODO Debug-only - drop this once there's a real hit-reaction (e.g. a target actor flashing).
    private static readonly IMPACT_MARKER_LIFETIME_MS : number = 300;
    private static readonly BEAM_LIFETIME_MS : number = 100;
    private static readonly BEAM_OPACITY : number = 0.2;

    //The marker and beam each fade/expire on their own via UpdateEffects() (every Tick) - the
    //GameEvents subscription below is the only other way they get cleared, ahead of that timer.
    private static activeEffects = new Set<TimedEffect>();

    public Fire() {
        if (this.cooldownRemaining > 0) return;
        this.cooldownRemaining = 1 / this.fireRate;

        PlaySound('fireWeapon');
        this.recoilOffset = Math.min(this.recoilOffset + NVWeapon.RECOIL_KICK, NVWeapon.RECOIL_MAX);

        const camera = MainCamera.GetCamera();
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        const ray = new THREE.Ray(camera.position.clone(), direction);

        //Solid world geometry, checked separately from shootables below - a shootable isn't
        //necessarily solid itself (e.g. NVMovingTargetActor) and wouldn't otherwise be reachable.
        const solidHit = NVScene.worldOctree.rayIntersect(ray);
        const solidDistance = (solidHit && solidHit.distance <= NVWeapon.WEAPON_DISTANCE) ? solidHit.distance : Infinity;

        //Closest shootable this ray actually enters, capped so a wall between the camera and a
        //target still blocks the shot from reaching it.
        const shootableHit = NVWeapon.RaycastShootables(ray, Math.min(solidDistance, NVWeapon.WEAPON_DISTANCE));

        const didHit = !!shootableHit || solidDistance <= NVWeapon.WEAPON_DISTANCE;
        const endPoint = shootableHit ? shootableHit.position
            : didHit ? solidHit!.position
            : camera.position.clone().addScaledVector(direction, NVWeapon.WEAPON_DISTANCE);

        //Drawn from the muzzle, not the eye - a beam running exactly along the camera's own view
        //ray is invisible to that camera (it's foreshortened to a point), same as a real tracer.
        const muzzlePosition = this.meshComponent.mesh.getWorldPosition(new THREE.Vector3());
        NVWeapon.ShowTraceBeam(muzzlePosition, endPoint);

        if (didHit) {
            console.log("Weapon hit at", endPoint, "distance", (shootableHit?.distance ?? solidDistance).toFixed(2));
            NVWeapon.ShowImpactMarker(endPoint);
            shootableHit?.actor.RegisterHit();
        } else {
            console.log("Weapon fired - no hit within range");
        }
    }

    //Finds the nearest IShootable whose bounds this ray actually enters, within maxDistance -
    //targets (moving or not) and NVDeactivatableCannon's switch cube alike.
    private static RaycastShootables(ray : THREE.Ray, maxDistance : number) {
        let closest : {actor : NVActor & IShootable, position : THREE.Vector3, distance : number} | null = null;
        const point = new THREE.Vector3();

        for (const actor of NVScene.GetSceneActors()) {
            if (!IsShootable(actor)) continue;
            if (!ray.intersectBox(actor.bounds, point)) continue;

            const distance = ray.origin.distanceTo(point);
            if (distance > maxDistance) continue;
            if (!closest || distance < closest.distance) closest = {actor, position: point.clone(), distance};
        }
        return closest;
    }

    //A small sphere at the hit point that fades out over IMPACT_MARKER_LIFETIME_MS - lets you
    //actually see a trace landed, ahead of any real hit-reaction.
    private static ShowImpactMarker(position : THREE.Vector3) {
        const geometry = new THREE.SphereGeometry(0.08, 8, 8);
        const material = new THREE.MeshBasicMaterial({color: '#ff0033', transparent: true, opacity: 1});
        const marker = new THREE.Mesh(geometry, material);
        marker.position.copy(position);
        NVScene.scene.add(marker);

        NVWeapon.activeEffects.add({
            object: marker,
            material,
            spawnTime: performance.now(),
            lifetimeMs: NVWeapon.IMPACT_MARKER_LIFETIME_MS,
            baseOpacity: 1,
            fadeOut: true,
        });
    }

    //Wide, not razor-thin - a shot down the crosshair is nearly collinear with the camera's own
    //view ray and would otherwise be invisible (a THREE.Line was tried first; WebGL caps width to ~1px).
    private static readonly BEAM_RADIUS : number = 0.03;

    //A faint white beam along the trace path, gone almost as soon as it appears.
    private static ShowTraceBeam(start : THREE.Vector3, end : THREE.Vector3) {
        const offset = new THREE.Vector3().subVectors(end, start);
        const length = offset.length();
        if (length < 1e-6) return;

        const geometry = new THREE.CylinderGeometry(NVWeapon.BEAM_RADIUS, NVWeapon.BEAM_RADIUS, length, 6);
        const material = new THREE.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: NVWeapon.BEAM_OPACITY, depthWrite: false});
        const beam = new THREE.Mesh(geometry, material);

        //Cylinders are built along +Y by default - rotate onto the trace direction and center it.
        beam.position.copy(start).addScaledVector(offset, 0.5);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), offset.normalize());

        NVScene.scene.add(beam);

        NVWeapon.activeEffects.add({
            object: beam,
            material,
            spawnTime: performance.now(),
            lifetimeMs: NVWeapon.BEAM_LIFETIME_MS,
            baseOpacity: NVWeapon.BEAM_OPACITY,
            fadeOut: false,
        });
    }

    //Fades (if fadeOut) and expires every active marker/beam once its lifetime's up.
    private static UpdateEffects() {
        const now = performance.now();
        for (const effect of [...NVWeapon.activeEffects]) {
            const elapsed = now - effect.spawnTime;
            if (elapsed >= effect.lifetimeMs) {
                NVWeapon.RemoveEffect(effect);
            } else if (effect.fadeOut) {
                effect.material.opacity = effect.baseOpacity * (1 - elapsed / effect.lifetimeMs);
            }
        }
    }

    private static RemoveEffect(effect : TimedEffect) {
        NVScene.scene.remove(effect.object);
        effect.object.geometry.dispose();
        effect.material.dispose();
        NVWeapon.activeEffects.delete(effect);
    }

    //Flushes every active marker/beam immediately, ahead of its own timer - see the GameEvents
    //subscription below, so effects don't linger from one mode into the other.
    public static ClearEffects() {
        for (const effect of [...NVWeapon.activeEffects]) NVWeapon.RemoveEffect(effect);
    }
}

//Every editor/play transition, in either direction, should flush active shot effects.
GameEvents.On('editorModeChanged', () => NVWeapon.ClearEffects());
