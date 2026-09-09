import {NVActor} from "../Actor.ts";
import * as THREE from "three";
import {RegisterClass, type SpawnDescriptor} from "../ClassDescripter.ts";
import {NVScene} from "../NVScene.ts";
import {StaticMeshComponent} from "../Components/StaticMeshComponent.ts";
import {EditableProperty} from "../Editor/EditableProperty.ts";
import {ColorSwitchState, type SwitchColor} from "../Gameplay/ColorSwitch.ts";

const COLOR_HEX : Record<SwitchColor, string> = {
    red: '#e63946',
    blue: '#3d84e6',
};

//Solid + full-size while `color` matches ColorSwitchState's active color, shrunk + translucent +
//non-solid while it doesn't - shot an NVSwitchButtonActor to flip which set is which, Mario
//Maker on/off-block style. The mesh is a child component (not `scene` itself) so its shrink
//animation stays separate from the actor's own baked scale/live gizmo scale, same reasoning as
//NVMovingBladeActor's base cube.
@RegisterClass("NVDisappearingCubeActor")
export class NVDisappearingCubeActor extends NVActor {

    //How much smaller/fainter the cube gets while off, relative to its placed size.
    private static readonly INACTIVE_SCALE = 0.35;
    private static readonly INACTIVE_OPACITY = 0.35;

    @EditableProperty({choices: ['red', 'blue']})
    public color : SwitchColor = 'red';

    private readonly meshComponent : StaticMeshComponent;
    private readonly material : THREE.MeshStandardMaterial;
    private readonly unsubscribe : () => void;

    constructor(descripter : SpawnDescriptor) {
        super(descripter);

        this.scene = new THREE.Group();

        const hex = COLOR_HEX[this.color];
        this.material = new THREE.MeshStandardMaterial({
            color: hex,
            emissive: hex,
            emissiveIntensity: 0.3,
            transparent: true,
        });
        this.meshComponent = new StaticMeshComponent(this, new THREE.BoxGeometry(1, 1, 1), this.material);

        this.unsubscribe = ColorSwitchState.Subscribe(() => this.ApplyActiveState());
    }

    public async Init(descripter : SpawnDescriptor) {
        this.SetWorldLocation(descripter.location);
        this.ApplyActiveState();
        this.RegisterCollision();
    }

    public OnEditablePropertyChanged(key : string) : void {
        super.OnEditablePropertyChanged(key);
        if (key !== 'color') return;

        const hex = COLOR_HEX[this.color];
        this.material.color.set(hex);
        this.material.emissive.set(hex);
        this.ApplyActiveState();
        NVScene.RebuildWorldOctree();
    }

    private IsActive() : boolean {
        return ColorSwitchState.GetActive() === this.color;
    }

    //Resizes/fades the mesh to match on/off state and re-registers collision - called on spawn
    //and every switch toggle. Doesn't itself rebuild the world octree (RegisterCollision alone
    //only adds/leaves this one actor out of the existing octree); NVSwitchButtonActor.RegisterHit
    //does one full NVScene.RebuildWorldOctree() after toggling, covering every cube at once.
    private ApplyActiveState() {
        const active = this.IsActive();
        const scale = this.spawnDescriptor.scale;
        const factor = active ? 1 : NVDisappearingCubeActor.INACTIVE_SCALE;
        this.meshComponent.mesh.scale.set(scale.x * factor, scale.y * factor, scale.z * factor);
        this.material.opacity = active ? 1 : NVDisappearingCubeActor.INACTIVE_OPACITY;
    }

    //Solid only while active - see ApplyActiveState, which decides that. Also called on an
    //editor gizmo move (see NVScene.RebuildWorldOctree) and by NVSwitchButtonActor after a toggle.
    public RegisterCollision() {
        if (!this.IsActive()) return;
        NVScene.worldOctree.fromGraphNode(this.meshComponent.mesh);
    }

    public BeginDestroy() {
        super.BeginDestroy();
        this.unsubscribe();
    }
}
