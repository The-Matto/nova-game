import {useState} from "react";
import {PlayerStatics} from "../../../Three/Utility/PlayerGlobals";
import {EDITOR_PALETTE} from "../../../Three/Editor/EditorPalette";
import {EditorSpawning} from "../../../Three/Editor/EditorSpawning";
import {NVScene} from "../../../Three/NVScene";
import type {LevelData} from "../../../Three/ClassDescripter";

//Sits at the far right (see EditorMenu) - clicking an item spawns and selects it (see
//EditorSpawning). Also Export/Import for the level snapshot, clipboard-based for now. Unmounted
//along with the rest of EditorMenu on leaving editor mode, so search/import state doesn't need
//resetting by hand - it just starts fresh next mount.
export const EditorPalettePanel = () => {

    const [search, setSearch] = useState("");
    const [copied, setCopied] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState("");
    const [importError, setImportError] = useState<string | null>(null);

    const query = search.trim().toLowerCase();
    //Categories with nothing matching the search drop out entirely, rather than showing an
    //empty header.
    const visibleCategories = EDITOR_PALETTE
        .map(category => ({
            ...category,
            items: category.items.filter(item => item.label.toLowerCase().includes(query)),
        }))
        .filter(category => category.items.length > 0);

    //JSON.stringify replacer - rounds every number to 3 decimal places, so a gizmo-dragged value
    //like 5.32523346241 gets stored as 5.325 instead of full floating-point noise.
    const roundNumbers = (_key : string, value : unknown) =>
        typeof value === 'number' ? Math.round(value * 1000) / 1000 : value;

    const exportLevel = async () => {
        const json = JSON.stringify(NVScene.SerializeLevel(), roundNumbers, 2);
        try {
            await navigator.clipboard.writeText(json);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            console.error("Failed to copy level JSON to clipboard");
        }
    };

    const importLevel = () => {
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
        setShowImport(false);
        setImportText("");
        setImportError(null);
    };

    return <div className="pointer-events-auto w-36 max-h-[85vh] overflow-y-auto bg-slate-900 rounded-xl p-4 text-orange-500">
        <div className="text-x2 font-bold mb-3">Editor</div>

        <button
            className="w-full mb-3 bg-emerald-700 hover:bg-emerald-600 rounded-lg px-1.5 py-1 text-xs font-bold cursor-pointer"
            onClick={() => PlayerStatics.PlayerController?.EnterPlayMode()}
        >
            ▶ Play
        </button>

        <div className="flex flex-col gap-2 mb-3">
            <button
                className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg px-1.5 py-1 text-xs cursor-pointer"
                onClick={exportLevel}
            >
                {copied ? "Copied!" : "Export"}
            </button>
            <button
                className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg px-1.5 py-1 text-xs cursor-pointer"
                onClick={() => {
                    setShowImport(v => !v);
                    setImportError(null);
                }}
            >
                Import
            </button>
        </div>

        {showImport && (
            <div className="mb-3 flex flex-col gap-2">
                <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Paste level JSON..."
                    rows={5}
                    className="w-full bg-slate-800 rounded-lg px-3 py-2 text-orange-100 placeholder-orange-500/40 outline-none text-sm resize-none"
                />
                {importError && <div className="text-sm text-red-400">{importError}</div>}
                <button
                    className="bg-slate-800 hover:bg-slate-700 rounded-lg px-1.5 py-1 text-xs cursor-pointer"
                    onClick={importLevel}
                >
                    Load
                </button>
            </div>
        )}

        <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full mb-3 bg-slate-800 rounded-lg px-3 py-2 text-orange-100 placeholder-orange-500/40 outline-none"
        />

        {visibleCategories.length === 0 && (
            <div className="text-sm text-orange-500/60">No matches.</div>
        )}

        {visibleCategories.map(category => (
            <div key={category.label} className="mb-3 last:mb-0">
                <div className="text-xs uppercase tracking-wide text-orange-500/60 mb-1">{category.label}</div>
                <div className="flex flex-col gap-1">
                    {category.items.map(item => (
                        <button
                            key={item.label}
                            className="flex items-center gap-2 text-left bg-slate-800 hover:bg-slate-700 rounded-lg px-1.5 py-1 text-xs cursor-pointer"
                            onClick={() => EditorSpawning.SpawnFromPalette(item)}
                        >
                            <img
                                src={`/T_NV_${item.label.replace(/\s+/g, '')}.png`}
                                alt=""
                                className="w-5 h-5 shrink-0 object-contain"
                                //No icon file for this actor yet - collapse instead of showing a
                                //broken-image glyph. Drop a same-named PNG in public/ to add one.
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        ))}
    </div>;
};
