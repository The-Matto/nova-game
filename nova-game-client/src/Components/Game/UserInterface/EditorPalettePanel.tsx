import {useEffect, useState} from "react";
import {PlayerStatics} from "../../../Three/Utility/PlayerGlobals";
import {EDITOR_PALETTE} from "../../../Three/Editor/EditorPalette";
import {EditorSpawning} from "../../../Three/Editor/EditorSpawning";
import {NVScene, MAX_LEVEL_ACTORS} from "../../../Three/NVScene";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {OptionsMenu} from "./OptionsMenu";

//Fills up as the level's actor count approaches NVScene.MAX_LEVEL_ACTORS - see
//EditorSpawning/EditorSelection, which stop letting you place more once it's full.
const ActorLimitBar = () => {
    const [count, setCount] = useState(NVScene.GetLevelActorCount());

    useEffect(() => {
        return GameEvents.On('levelActorCountChanged', payload => setCount(payload.count));
    }, []);

    const fraction = Math.min(count / MAX_LEVEL_ACTORS, 1);
    const isFull = count >= MAX_LEVEL_ACTORS;

    return <div className="mb-3">
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-orange-500/60 mb-1">
            <span>Actors</span>
            <span>{count}/{MAX_LEVEL_ACTORS}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
                className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-orange-500'}`}
                style={{width: `${fraction * 100}%`}}
            />
        </div>
    </div>;
};

//'P' is taken while actually editing - it starts Play mode instead of pausing (see
//PlayerController.ToggleEditorMode), since there's no gameplay running yet to pause. This is the
//only other way to reach Options/leave the editor - just those two, not Retry/Resume/Return to
//Editor, since none of those make sense while already sitting in the editor.
const EditorMenuOverlay = ({onClose} : {onClose : () => void}) => {
    const [showOptions, setShowOptions] = useState(false);

    if (showOptions) return <OptionsMenu onBack={() => setShowOptions(false)} />;

    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/25">
        <div className="flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-12 py-10">
            <div className="text-4xl font-bold text-orange-500">Menu</div>
            <button
                className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={onClose}
            >
                Resume Editing
            </button>
            <button
                className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={() => setShowOptions(true)}
            >
                Options
            </button>
            <button
                className="mt-4 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-lg text-orange-500/70 cursor-pointer"
                onClick={() => window.location.reload()}
            >
                Return to Menu
            </button>
        </div>
    </div>;
};

//Sits at the far right (see EditorMenu) - clicking an item spawns and selects it (see
//EditorSpawning). Save/load/upload live in EditorWorldSettingsPanel instead, on the left -
//unmounted along with the rest of EditorMenu on leaving editor mode, so search state doesn't
//need resetting by hand, it just starts fresh next mount.
export const EditorPalettePanel = () => {

    const [search, setSearch] = useState("");
    const [showMenu, setShowMenu] = useState(false);

    //Escape already pauses during actual gameplay (Canvas.tsx's pointerlockchange handler - it
    //always releases pointer lock, browsers won't let JS prevent that). This covers the other
    //case: purely editing, no pointer lock to lose. Ignored while typing so cancelling text
    //entry doesn't also pop this open.
    useEffect(() => {
        const onKeyDown = (e : KeyboardEvent) => {
            if (e.code !== 'Escape') return;
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            setShowMenu(true);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

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
        {showMenu && <EditorMenuOverlay onClose={() => setShowMenu(false)} />}

        <div className="text-x2 font-bold mb-3">Editor</div>

        <div className="flex gap-1.5 mb-3">
            <button
                className="flex-1 bg-emerald-700 hover:bg-emerald-600 rounded-lg px-1.5 py-1 text-xs font-bold cursor-pointer"
                onClick={() => PlayerStatics.PlayerController?.EnterPlayMode()}
            >
                ▶ Play
            </button>
            <button
                className="bg-slate-800 hover:bg-slate-700 rounded-lg px-2 py-1 text-xs cursor-pointer"
                onClick={() => setShowMenu(true)}
            >
                ☰
            </button>
        </div>

        <ActorLimitBar />

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
