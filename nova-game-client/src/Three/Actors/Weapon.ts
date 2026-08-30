import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {MainCamera} from "../Camera.ts";
import {GameEvents} from "../Utility/GameEvents.ts";
import {NVTargetActor} from "./TargetActor.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";
import {PlayerSettings, PlayerStatics} from "../Utility/PlayerGlobals.ts";

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

    //Friction decays velocity asymptotically rather than snapping it to zero - below this speed,
    //treat the player as stopped so the lean eases back to neutral as soon as they're slowing
    //down, rather than waiting for velocity to decay almost all the way to zero first.
    private static readonly MOVEMENT_THRESHOLD : number = 5;

    //Recoil kick added to the pitch on Fire(), and how fast it eases back out afterward - kept
    //separate from the movement lean's own pitch so the two don't fight over rotation.x. Kicks
    //stack on rapid fire (capped at RECOIL_MAX) rather than resetting, for a climbing feel.
    private static readonly RECOIL_KICK : number = THREE.MathUtils.degToRad(15);
    private static readonly RECOIL_MAX : number = THREE.MathUtils.degToRad(35);
    private static readonly RECOIL_RECOVERY_SPEED : number = 6;
    private movementPitch : number = 0;
    private recoilOffset : number = 0;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        const material = new THREE.MeshStandardMaterial({color: '#2b2b2b'});
        this.meshComponent = new StaticMeshComponent(this, new THREE.BoxGeometry(0.1, 0.12, 0.4), material, NVWeapon.VIEWMODEL_OFFSET);
    }

    //Leans the viewmodel (and, more subtly, the camera itself) into whichever way the player's
    //moving - strafing rolls it, moving forward/back pitches it - just a cosmetic read on player
    //velocity, not physically driven.
    Tick(deltaTime : number) {
        super.Tick(deltaTime);

        //Horizontal only - vertical velocity (falling, jumping) never decays via friction, so
        //including it would keep the lean alive well after the player's actually stopped moving.
        const velocity = PlayerStatics.PlayerCharacter?.GetPhysicsComp().playerVelocity;
        const horizontalVelocity = velocity ? new THREE.Vector3(velocity.x, 0, velocity.z) : new THREE.Vector3();

        //Direction stays a unit vector always (normalize() is a safe no-op on a zero vector), so
        //the dot products below stay bounded to [-1,1] - speedFactor is what actually fades the
        //lean out as the player slows down, dropping to 0 well before they've fully stopped.
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

    //A momentary visual per shot - the marker and the beam - each fades/expires on its own via
    //UpdateEffects(), called every Tick(). See the GameEvents subscription below for the one
    //other way these get cleared (a mode switch, ahead of their own timers).
    private static activeEffects = new Set<TimedEffect>();

    public Fire() {
        this.recoilOffset = Math.min(this.recoilOffset + NVWeapon.RECOIL_KICK, NVWeapon.RECOIL_MAX);

        const camera = MainCamera.GetCamera();
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        const ray = new THREE.Ray(camera.position.clone(), direction);
        const hit = NVScene.worldOctree.rayIntersect(ray);
        const didHit = !!hit && hit.distance <= NVWeapon.WEAPON_DISTANCE;
        const endPoint = didHit ? hit!.position : camera.position.clone().addScaledVector(direction, NVWeapon.WEAPON_DISTANCE);

        //Drawn from the muzzle, not the eye - a beam running exactly along the camera's own view
        //ray is invisible to that camera (it's foreshortened to a point), same as a real tracer.
        const muzzlePosition = this.meshComponent.mesh.getWorldPosition(new THREE.Vector3());
        NVWeapon.ShowTraceBeam(muzzlePosition, endPoint);

        if (didHit) {
            console.log("Weapon hit at", hit!.position, "distance", hit!.distance.toFixed(2));
            NVWeapon.ShowImpactMarker(hit!.position);
            NVWeapon.RegisterTargetHit(hit!.position);
        } else {
            console.log("Weapon fired - no hit within range");
        }
    }

    //Small margin on the bounds check below, since a trace's impact point sits exactly on the
    //target's surface and floating-point rounding could otherwise put it a hair outside.
    private static readonly HIT_BOUNDS_EPSILON : number = 0.01;

    //Finds whichever target's bounds the impact point landed in and registers the hit. Targets
    //already block the trace via world collision, so this only figures out WHICH actor was hit.
    private static RegisterTargetHit(position : THREE.Vector3) {
        for (const actor of NVScene.GetSceneActors()) {
            if (!(actor instanceof NVTargetActor)) continue;

            const bounds = actor.bounds.clone().expandByScalar(NVWeapon.HIT_BOUNDS_EPSILON);
            if (bounds.containsPoint(position)) {
                actor.RegisterHit();
                return;
            }
        }
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

    //Diameter for the trace beam cylinder below - a razor-thin one is invisible in a first-person
    //view, since a shot down the crosshair is always nearly collinear with the camera's own view
    //ray (foreshortened to a point no matter the opacity); wide enough here to still read as a
    //visible cone/glow near the muzzle even head-on. (A THREE.Line was tried first, but WebGL
    //caps line width to ~1px regardless of material settings, making it invisible either way.)
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
