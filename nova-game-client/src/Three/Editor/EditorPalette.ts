//What shows up in the editor's "spawn actor" panel, grouped into categories.

export interface SpawnableItem {
    label : string;
    //Matches a class name registered via @RegisterClass (see ClassDescripter.ts).
    class : string;
    properties? : Record<string, unknown>;
    //Defaults to (1,1,1) - see EditorSpawning.SpawnFromPalette. Override for an actor whose
    //useful default shape isn't a unit cube (e.g. a platform, which wants to start flat and wide).
    scale? : { x : number, y : number, z : number };
}

export interface SpawnableCategory {
    label : string;
    items : SpawnableItem[];
}

export const EDITOR_PALETTE : SpawnableCategory[] = [
    {
        label: "Gameplay",
        items: [
            //Defaults to a cube - see NVStaticMeshActor's own "shape" dropdown for the rest.
            {label: "Static Mesh", class: "NVStaticMeshActor"},
            {label: "Player Start", class: "NVPlayerSpawn"},
            {label: "Goal", class: "NVGoalVolume"},
            //z is the disc's thickness now (see NVTargetActor's rotated cylinder) - thin by default.
            {label: "Target", class: "NVTargetActor", scale: {x: 1, y: 1, z: 0.2}},
            //Lerps back and forth between spawn and spawn+offset - see
            //NVMovingTargetActor.offset/cycleDuration.
            {label: "Moving Target", class: "NVMovingTargetActor", scale: {x: 1, y: 1, z: 0.2}},
            {label: "Spikes", class: "NVSpikeActor"},
            //A blade sliding back and forth out of a mount cube - see
            //NVMovingBladeActor.travelDistance/cycleDuration.
            {label: "Moving Blade", class: "NVMovingBladeActor"},
            //Matches the scale of TestWorld.json's jump platforms.
            {label: "Falling Platform", class: "FallingPlatform", scale: {x: 1.8, y: 0.3, z: 2}},
            {label: "Cannon", class: "NVCannon"},
            //A regular cannon with a shootable switch on top - hitting it disables firing for a
            //while (see NVDeactivatableCannon.deactivateDuration).
            {label: "Switch Cannon", class: "NVDeactivatableCannon"},
            //A doorway-shaped default (width, height, thickness) rather than a unit cube.
            {label: "Door", class: "NVDoorActor", scale: {x: 2.2, y: 3.5, z: 0.4}},
        ],
    },
    {
        label: "Post Process",
        items: [
            //Room-sized by default - meant to enclose an area, not sit as a small marker.
            {label: "Post Process Volume", class: "NVPostProcessVolume", scale: {x: 6, y: 4, z: 6}},
        ],
    },
    {
        label: "Powerups",
        items: [
            //Smaller than a unit cube by default - a pickup, not a block.
            {label: "Powerup Pickup", class: "NVPowerupPickup", scale: {x: 0.6, y: 0.6, z: 0.6}},
        ],
    },
];

const CLASS_TO_LABEL = new Map(
    EDITOR_PALETTE.flatMap(category => category.items.map(item => [item.class, item.label] as const))
);

//Friendly display name for an actor's registered class (see EditorInspectorPanel) - looked up
//from the palette above rather than the raw class name, which is both unfriendly and, in a
//production build, minified/mangled. Falls back to a readable guess for a class that isn't
//player-placeable (e.g. the persistent editor pawn), so the panel never shows a blank/mangled name.
export function GetActorDisplayName(className : string) : string {
    return CLASS_TO_LABEL.get(className) ?? className.replace(/^NV/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
}
