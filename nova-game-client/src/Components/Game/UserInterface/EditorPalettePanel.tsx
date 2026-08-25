import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {EditorState} from "../../../Three/Utility/PlayerGlobals";
import {EDITOR_PALETTE} from "../../../Three/Editor/EditorPalette";
import {EditorSpawning} from "../../../Three/Editor/EditorSpawning";

//The list of spawnable actors, shown only while in editor mode. Clicking an item spawns it in
//front of the camera and selects it - see EditorSpawning.
export const EditorPalettePanel = () => {

    //Reflects EditorState.isInEditor's current value (rather than always starting false) since
    //the game now launches straight into editor mode - see PlayInEditor.Initialize.
    const [isVisible, setIsVisible] = useState(EditorState.isInEditor);
    const [search, setSearch] = useState("");

    useEffect(() => {
        return GameEvents.On('editorModeChanged', ({isInEditor}) => {
            setIsVisible(isInEditor);
            //Don't carry a stale search across editor sessions.
            if (!isInEditor) setSearch("");
        });
    }, []);

    if (!isVisible) return null;

    const query = search.trim().toLowerCase();
    //Categories with nothing matching the search drop out entirely, rather than showing an
    //empty header.
    const visibleCategories = EDITOR_PALETTE
        .map(category => ({
            ...category,
            items: category.items.filter(item => item.label.toLowerCase().includes(query)),
        }))
        .filter(category => category.items.length > 0);

    return <div className="absolute top-4 left-4 z-30 w-56 max-h-[80vh] overflow-y-auto bg-slate-900 rounded-xl p-4 text-orange-500">
        <div className="text-xl font-bold mb-3">Editor</div>

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
                            className="text-left bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-2 cursor-pointer"
                            onClick={() => EditorSpawning.SpawnFromPalette(item)}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        ))}
    </div>;
};
