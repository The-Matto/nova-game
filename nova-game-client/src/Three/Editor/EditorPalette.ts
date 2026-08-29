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

//TODO Once levels can reference real models from a Cloudflare bucket, generate the Meshes
//category from its listing instead of hardcoding shapes here.
export const EDITOR_PALETTE : SpawnableCategory[] = [
    {
        label: "Meshes",
        items: [
            {label: "Cube", class: "NVStaticMeshActor"},
            {label: "Sphere", class: "NVStaticMeshActor", properties: {shape: "sphere"}},
        ],
    },
    {
        label: "Gameplay",
        items: [
            {label: "Player Start", class: "NVPlayerSpawn"},
            {label: "Goal", class: "NVGoalVolume"},
            //z is the disc's thickness now (see NVTargetActor's rotated cylinder) - thin by default.
            {label: "Target", class: "NVTargetActor", scale: {x: 1, y: 1, z: 0.2}},
            {label: "Spikes", class: "NVSpikeActor"},
            //Matches the scale of TestWorld.json's jump platforms.
            {label: "Falling Platform", class: "FallingPlatform", scale: {x: 1.8, y: 0.3, z: 2}},
            {label: "Cannon", class: "NVCannon"},
        ],
    },
];
