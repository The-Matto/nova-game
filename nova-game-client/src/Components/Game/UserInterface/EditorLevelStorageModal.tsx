import {useEffect, useState} from "react";
import {NVScene} from "../../../Three/NVScene";
import {Game} from "../../../Three/Game";
import {DeleteSavedLevel, ListSavedLevels, SaveLevel, type SavedLevel} from "../../../Three/Editor/EditorLevelStorage";
import type {LevelData} from "../../../Three/ClassDescripter";

//JSON.stringify replacer - rounds every number to 3 decimal places, so a gizmo-dragged value
//like 5.32523346241 gets stored as 5.325 instead of full floating-point noise.
const roundNumbers = (_key : string, value : unknown) =>
    typeof value === 'number' ? Math.round(value * 1000) / 1000 : value;

//One saved-level card - thumbnail + name, a ⋮ menu in the corner for Delete, clicking anywhere
//else on the card loads it.
const SavedLevelCard = ({level, onLoad, onDelete} : {
    level : SavedLevel,
    onLoad : () => void,
    onDelete : () => void,
}) => {
    const [showMenu, setShowMenu] = useState(false);

    return <div className="relative">
        <button
            className="w-full flex flex-col gap-1 cursor-pointer text-left"
            onClick={onLoad}
        >
            <img
                src={level.thumbnailDataUrl}
                alt=""
                className="w-full aspect-video object-cover rounded-lg bg-slate-800"
            />
            <div className="text-xs text-orange-100 truncate">{level.name}</div>
        </button>

        <button
            className="absolute bottom-6 right-1 w-5 h-5 flex items-center justify-center rounded-md bg-slate-950/70 hover:bg-slate-800 text-white text-xs cursor-pointer"
            onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
        >
            ⋮
        </button>

        {showMenu && (
            <div className="absolute bottom-11 right-1 bg-slate-800 rounded-lg overflow-hidden text-xs z-10">
                <button
                    className="block w-full px-3 py-1.5 text-left text-red-400 hover:bg-slate-700 cursor-pointer"
                    onClick={e => { e.stopPropagation(); setShowMenu(false); onDelete(); }}
                >
                    Delete
                </button>
            </div>
        )}
    </div>;
};

//Replaces the old separate Export/Import buttons - Save captures a screenshot + the current
//level and stores both in localStorage under a name; Load lists what's saved. Plain JSON export/
//import stick around as a secondary option (sharing a level outside the browser, or a backup
//that survives clearing site data), just not the primary flow anymore.
export const EditorLevelStorageModal = ({onClose} : {onClose : () => void}) => {
    const [mode, setMode] = useState<'save' | 'load'>('save');

    const [saveName, setSaveName] = useState("");
    const [saveError, setSaveError] = useState<string | null>(null);

    const [levels, setLevels] = useState<SavedLevel[]>([]);
    const [showJsonExport, setShowJsonExport] = useState(false);
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [jsonCopied, setJsonCopied] = useState(false);
    const [importText, setImportText] = useState("");
    const [importError, setImportError] = useState<string | null>(null);

    useEffect(() => {
        if (mode === 'load') setLevels(ListSavedLevels());
    }, [mode]);

    const saveCurrentLevel = () => {
        const name = saveName.trim();
        if (!name) return;

        const thumbnailDataUrl = Game.GetInstance().renderer.renderer.domElement.toDataURL('image/jpeg', 0.85);
        const success = SaveLevel(name, NVScene.SerializeLevel(), thumbnailDataUrl);
        if (!success) {
            setSaveError("Couldn't save - browser storage may be full.");
            return;
        }
        setSaveName("");
        setSaveError(null);
        onClose();
    };

    const loadLevel = (level : SavedLevel) => {
        NVScene.LoadFromSnapshot(level.levelData);
        onClose();
    };

    const deleteLevel = (name : string) => {
        DeleteSavedLevel(name);
        setLevels(ListSavedLevels());
    };

    const exportJson = async () => {
        const json = JSON.stringify(NVScene.SerializeLevel(), roundNumbers, 2);
        try {
            await navigator.clipboard.writeText(json);
            setJsonCopied(true);
            setTimeout(() => setJsonCopied(false), 1500);
        } catch {
            console.error("Failed to copy level JSON to clipboard");
        }
    };

    const importJson = () => {
        let data : LevelData;
        try {
            data = JSON.parse(importText);
        } catch {
            setImportError("That's not valid JSON.");
            return;
        }
        if (!Array.isArray(data.actorsToSpawn)) {
            setImportError('Missing an "actorsToSpawn" array.');
            return;
        }
        NVScene.LoadFromSnapshot(data);
        onClose();
    };

    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50">
        <div className="flex flex-col gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-8 py-6 w-full max-w-md max-h-[80vh]">
            <div className="flex gap-2">
                <button
                    className={`flex-1 rounded-lg px-3 py-2 text-sm cursor-pointer ${mode === 'save' ? "bg-orange-500 text-slate-950 font-bold" : "bg-slate-800 text-orange-500 hover:bg-slate-700"}`}
                    onClick={() => setMode('save')}
                >
                    Save
                </button>
                <button
                    className={`flex-1 rounded-lg px-3 py-2 text-sm cursor-pointer ${mode === 'load' ? "bg-orange-500 text-slate-950 font-bold" : "bg-slate-800 text-orange-500 hover:bg-slate-700"}`}
                    onClick={() => setMode('load')}
                >
                    Load
                </button>
            </div>

            {mode === 'save' && (
                <div className="flex flex-col gap-3">
                    <input
                        type="text"
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        placeholder="Level name..."
                        autoFocus
                        className="w-full bg-slate-800 rounded-lg px-3 py-2 text-orange-100 placeholder-orange-500/40 outline-none text-sm"
                    />
                    {saveError && <div className="text-sm text-red-400">{saveError}</div>}
                    <button
                        className="bg-emerald-700 hover:bg-emerald-600 rounded-lg px-3 py-2 text-sm text-orange-100 cursor-pointer disabled:opacity-50"
                        onClick={saveCurrentLevel}
                        disabled={!saveName.trim()}
                    >
                        Save to browser
                    </button>

                    <button
                        className="self-start text-xs text-orange-500/60 hover:text-orange-500 cursor-pointer"
                        onClick={() => setShowJsonExport(v => !v)}
                    >
                        {showJsonExport ? "Hide" : "Export as JSON instead"}
                    </button>
                    {showJsonExport && (
                        <button
                            className="bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 text-xs text-orange-500 cursor-pointer self-start"
                            onClick={exportJson}
                        >
                            {jsonCopied ? "Copied!" : "Copy level JSON to clipboard"}
                        </button>
                    )}
                </div>
            )}

            {mode === 'load' && (
                <div className="flex flex-col gap-3 overflow-y-auto">
                    {levels.length === 0 && <div className="text-sm text-white/50">Nothing saved yet.</div>}
                    <div className="grid grid-cols-3 gap-3">
                        {levels.map(level => (
                            <SavedLevelCard
                                key={level.name}
                                level={level}
                                onLoad={() => loadLevel(level)}
                                onDelete={() => deleteLevel(level.name)}
                            />
                        ))}
                    </div>

                    <button
                        className="self-start text-xs text-orange-500/60 hover:text-orange-500 cursor-pointer"
                        onClick={() => setShowJsonImport(v => !v)}
                    >
                        {showJsonImport ? "Hide" : "Import from JSON instead"}
                    </button>
                    {showJsonImport && (
                        <div className="flex flex-col gap-2">
                            <textarea
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                                placeholder="Paste level JSON..."
                                rows={4}
                                className="w-full bg-slate-800 rounded-lg px-3 py-2 text-orange-100 placeholder-orange-500/40 outline-none text-sm resize-none"
                            />
                            {importError && <div className="text-sm text-red-400">{importError}</div>}
                            <button
                                className="self-start bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 text-xs text-orange-500 cursor-pointer"
                                onClick={importJson}
                            >
                                Load
                            </button>
                        </div>
                    )}
                </div>
            )}

            <button
                className="self-start bg-slate-800 hover:bg-slate-700 rounded-lg px-4 py-2 text-sm text-orange-500/70 cursor-pointer"
                onClick={onClose}
            >
                Close
            </button>
        </div>
    </div>;
};
