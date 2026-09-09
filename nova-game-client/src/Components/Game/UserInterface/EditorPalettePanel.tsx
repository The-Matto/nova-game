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

    return <div className="pointer-events-auto w-36 max-h-[85vh] overflow-y-auto bg-slate-900 rounded-xl p-4 text-orange-500">
        <div className="text-x2 font-bold mb-3">Editor</div>

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
