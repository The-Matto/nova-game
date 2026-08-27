//What shows up in the editor's "spawn actor" panel, grouped into categories.

export interface SpawnableItem {
    label : string;
    //Matches a class name registered via @RegisterClass (see ClassDescripter.ts).
    class : string;
    properties? : Record<string, unknown>;
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
            {label: "Target", class: "NVTargetActor"},
            {label: "Spikes", class: "NVSpikeActor"},
        ],
    },
];
