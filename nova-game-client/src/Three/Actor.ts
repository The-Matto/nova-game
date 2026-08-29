
import * as THREE from "three";
import type {SpawnDescriptor} from "./ClassDescripter.ts";
import type {NVComponent} from "./Components/NVComponent.ts";
import {Vector3} from "three";
import {NVScene} from "./NVScene.ts";
import type {EditablePropertyOptions} from "./Editor/EditableProperty.ts";

//Base class which every game object inherits from
export class NVActor {

    components : Set<NVComponent> = new Set();

    //Kept so ToSpawnDescriptor() can round-trip non-editable properties and baked scale, while
    //location/rotation/@EditableProperty fields are read live instead.
    public spawnDescriptor : SpawnDescriptor;

    constructor(descripter : SpawnDescriptor) {
        this.spawnDescriptor = descripter;
    }


    //Should this Actor be considered for replication
    static replicates : boolean = false;
    //List of properties on this Actor that will be replicated
    static replicatedProperties : Set<string>
    static replicateRate : number = 0;

    //Fields marked @EditableProperty (see Editor/EditableProperty.ts), keyed by field name.
    static editableProperties : Map<string, EditablePropertyOptions>

    //Excludes fields whose editCondition currently reads falsy - the inspector panel never gets
    //a chance to render what this leaves out, per EditConditionHides semantics.
    public GetEditableProperties() : { key : string, value : unknown, options : EditablePropertyOptions }[] {
        const ctor = this.constructor as typeof NVActor;
        if (!ctor.editableProperties) return [];

        const self = this as unknown as Record<string, unknown>;
        return [...ctor.editableProperties]
            .map(([key, options]) => ({key, value: self[key], options}))
            .filter(({options}) => !options.editCondition || Boolean(self[options.editCondition]));
    }

    //Called after the inspector panel writes a new value - override to react (e.g. update a
    //material color).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public OnEditablePropertyChanged(_key : string) : void {
    }

    //Applies saved values from a SpawnDescriptor's `properties` onto this actor's
    //@EditableProperty fields - see NVScene.SpawnActor, called right after construction so it
    //overwrites the class's own field defaults.
    public ApplyEditableProperties(properties : Record<string, unknown> | undefined) : void {
        const ctor = this.constructor as typeof NVActor;
        if (!properties || !ctor.editableProperties) return;

        //Only fires OnEditablePropertyChanged for values actually changing from the field's own
        //default - a saved level always round-trips every @EditableProperty, so without this a
        //value matching the default would still trigger a spurious "changed" side effect.
        const self = this as unknown as Record<string, unknown>;
        for (const key of ctor.editableProperties.keys()) {
            if (key in properties && properties[key] !== self[key]) {
                self[key] = properties[key];
                this.OnEditablePropertyChanged(key);
            }
        }
    }

    //Called on every actor when the player respawns - override to reset state that shouldn't
    //survive a death (e.g. NVFallingPlatform putting itself back together).
    public OnPlayerRespawned() : void {
    }

    //True once TryBeginPlay() has actually called BeginPlay() - see TryBeginPlay.
    private hasBegunPlay : boolean = false;

    //Real gameplay only, not while merely placed in editor mode - call via TryBeginPlay(), not directly.
    //TODO Add an EditorBeginPlay() counterpart if an actor ever needs editor-specific spawn setup.
    BeginPlay() : void {

    };

    //Call site for BeginPlay() - see NVScene.SpawnActor/BeginPlayForLevelActors. Guarded against
    //double-firing (e.g. PlayInEditor.RestartPlaying respawning mid-play).
    public TryBeginPlay() : void {
        if (this.hasBegunPlay) return;
        this.hasBegunPlay = true;
        this.BeginPlay();
    }

    public GetForwardVector() : Vector3 {
        const forward = new Vector3();
        this.scene.getWorldDirection(forward);
        return forward;
    }

    public GetRightVector() : Vector3 {
        const right = new Vector3();
        this.scene.getWorldDirection(right);
        right.y = 0;
        right.normalize();
        right.cross(new Vector3(0,1,0));
        return right;
    }

    //Called when object is destroyed
    BeginDestroy() : void {};

    //Registers this actor with the world collision octree - no-op by default, override for real
    //collision (see NVStaticMeshActor).
    public RegisterCollision() : void {
    }

    //Detaches `scene` from its parent. NVPawn overrides this to a no-op since its `scene` is the
    //shared MainCamera.
    public RemoveFromScene() : void {
        this.scene.parent?.remove(this.scene);
    }

    //A SpawnDescriptor that would recreate this actor in its current state - see
    //NVScene.SerializeLevel(). properties starts from the original spawn-time properties (e.g.
    //NVStaticMeshActor's modelPath/shape, never edited live) and overlays every current
    //@EditableProperty value on top, so live edits actually get saved.
    public ToSpawnDescriptor() : SpawnDescriptor {
        const ctor = this.constructor as typeof NVActor;
        const properties : Record<string, unknown> = {...this.spawnDescriptor.properties};
        if (ctor.editableProperties) {
            const self = this as unknown as Record<string, unknown>;
            for (const key of ctor.editableProperties.keys()) properties[key] = self[key];
        }

        return {
            class: this.spawnDescriptor.class,
            location: this.scene.position.clone(),
            rotation: new THREE.Vector3(this.scene.rotation.x, this.scene.rotation.y, this.scene.rotation.z),
            //Multiplies the baked spawn scale with the live gizmo multiplier so a respawn matches
            //size. Reads x/y/z only, never Vector3 methods - a JSON-loaded descriptor isn't one.
            scale: new THREE.Vector3(
                (this.spawnDescriptor.scale?.x ?? 1) * this.scene.scale.x,
                (this.spawnDescriptor.scale?.y ?? 1) * this.scene.scale.y,
                (this.spawnDescriptor.scale?.z ?? 1) * this.scene.scale.z,
            ),
            properties: Object.keys(properties).length > 0 ? properties : undefined,
        };
    }

    //Called every game frame
    Tick(_deltaTime : number) : void {
        for (const comp of this.components){
            comp.TickComponent(_deltaTime);
        }
    };

    CanCallTick() : boolean {
        //TODO Check this actor isnt be destroyed and has tick enabled
        return true;
    }
    public SetWorldLocation(newLocation : THREE.Vector3) : void {
        this.scene.position.set(newLocation.x, newLocation.y, newLocation.z);
    };

    public SetWorldRotation(rotation : THREE.Vector3) : void {
        this.scene.rotation.set(rotation.x, rotation.y, rotation.z);
    };

    //TODO Make this private
    public scene : THREE.Object3D = new THREE.Object3D();

    //TODO Add component list!

    //TODO DEPRECATE This function
    public UpdateCollision(){
        NVScene.worldOctree.fromGraphNode(this.scene);

    }

    public async Init(descripter : SpawnDescriptor){
        this.SetWorldLocation(descripter.location);
        this.RegisterCollision();

    }
}