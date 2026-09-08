import type {LevelData} from "../ClassDescripter";

const STORAGE_KEY = 'nova-game:editor-saved-levels';

export type SavedLevel = {
    name : string,
    levelData : LevelData,
    thumbnailDataUrl : string,
    savedAt : number,
};

function LoadAll() : SavedLevel[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function ListSavedLevels() : SavedLevel[] {
    return LoadAll().sort((a, b) => b.savedAt - a.savedAt);
}

//Overwrites any existing save under the same name, same as a typical save-file slot.
export function SaveLevel(name : string, levelData : LevelData, thumbnailDataUrl : string) : boolean {
    try {
        const levels = LoadAll().filter(l => l.name !== name);
        levels.push({name, levelData, thumbnailDataUrl, savedAt: Date.now()});
        localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
        return true;
    } catch {
        //Most likely the storage quota - nothing meaningful to recover, the caller shows an error.
        return false;
    }
}

export function DeleteSavedLevel(name : string) : void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(LoadAll().filter(l => l.name !== name)));
    } catch {
        //Ignore - not critical if this fails.
    }
}
