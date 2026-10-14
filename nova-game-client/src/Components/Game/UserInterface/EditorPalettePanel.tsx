import {useState} from "react";
import {EDITOR_PALETTE} from "../../../Three/Editor/EditorPalette";
import {EditorSpawning} from "../../../Three/Editor/EditorSpawning";

//Sits at the far right (see EditorMenu) - clicking an item spawns and selects it (see
//EditorSpawning). Save/load/upload, Play/Menu, and the actor count limit live in
//EditorWorldSettingsPanel instead, on the left - unmounted along with the rest of EditorMenu on
//leaving editor mode, so search state doesn't need resetting by hand, it just starts fresh next
//mount.
export const EditorPalettePanel = () => {

    const [search, setSearch] = useState("");

    const query = search.trim().toLowerCase();
    //Categories with nothing matching the search drop out entirely, rather than showing an
    //empty header.
    const visibleCategories = EDITOR_PALETTE
        .map(category => ({
            ...category,
            items: category.items.filter(item => item.label.toLowerCase().includes(query)),
        }))
        .filter(category => category.items.length > 0);

    return <div className="nv-panel nv-scroll pointer-events-auto w-40 max-h-[85vh] overflow-y-auto p-3">
        <div className="nv-title text-2xl mb-3">Spawn</div>

        <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="nv-input w-full mb-3 text-sm py-1"
        />

        {visibleCategories.length === 0 && (
            <div className="text-sm text-ash">No matches.</div>
        )}

        {visibleCategories.map(category => (
            <div key={category.label} className="mb-3 last:mb-0">
                <div className="nv-label mb-1 text-molten">{category.label}</div>
                <div className="flex flex-col gap-0.5">
                    {category.items.map(item => (
                        <button
                            key={item.label}
                            className="nv-row flex items-center gap-2 text-left px-1.5 py-1 text-xs font-semibold text-bone"
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
