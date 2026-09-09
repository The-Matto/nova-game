//A static, author-maintained list of starting-point levels under public/level-presets/ - see
//that folder's own README for the format. Unlike saved/uploaded levels, presets aren't
//discoverable automatically (this is a static site, no directory listing), so the manifest is
//the single source of truth for what's offered.
export type LevelPreset = {
    name : string,
    file : string,
    //Optional - resolved the same way as `file` (relative to level-presets/). Shows the tile's
    //usual "No preview" placeholder when omitted (see EditorStartupModal).
    thumbnail? : string,
};

export async function ListLevelPresets() : Promise<LevelPreset[]> {
    const res = await fetch('/level-presets/manifest.json');
    if (!res.ok) return [];
    const presets : unknown = await res.json();
    return Array.isArray(presets) ? presets : [];
}
