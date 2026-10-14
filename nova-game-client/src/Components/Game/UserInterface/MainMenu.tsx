import {useState} from "react";
import {CursorState, EditingLevel, EditorState, GameMode, LevelSelection} from "../../../Three/Utility/PlayerGlobals";
import {RecordLevelPlay} from "../../../Three/Utility/LevelPlays";
import {OptionsMenu} from "./OptionsMenu";
import {LevelBrowser} from "./LevelBrowser";
import {AccountSection} from "./AccountSection";
import type {LevelSummary} from "nova-shared/level-listing";

//Shown before the game exists at all - Canvas/Game only mount once a choice is made here. Sets
//GameMode.appMode (and EditorState/CursorState to match) before handing off.
export const MainMenu = ({onStart} : { onStart : () => void }) => {

    const [showOptions, setShowOptions] = useState(false);
    const [showLevelBrowser, setShowLevelBrowser] = useState(false);

    const playLevel = (level : LevelSummary) => {
        LevelSelection.selectedLevelPath = level.path;
        LevelSelection.selectedLevelId = level.id;
        GameMode.appMode = "play";
        EditorState.isInEditor = false;
        CursorState.isCursorNeeded = false;
        RecordLevelPlay(level.id);
        onStart();
    };

    //Opens on a genuinely blank level - EditorStartupModal offers a real choice right after, so
    //nothing here is seen unless the player picks the Blank tile.
    const openEditor = () => {
        LevelSelection.selectedLevelPath = "/BlankLevel.json";
        GameMode.appMode = "createLevel";
        EditorState.isInEditor = true;
        CursorState.isCursorNeeded = true;
        onStart();
    };

    //From a level's ⋮ menu - opens the editor on that level and remembers its id/metadata so
    //Upload can offer "Update" instead of only creating a new one.
    const editLevel = (level : LevelSummary) => {
        LevelSelection.selectedLevelPath = level.path;
        LevelSelection.selectedLevelId = level.id;
        EditingLevel.id = level.id;
        EditingLevel.name = level.name;
        EditingLevel.tags = level.tags;
        EditingLevel.description = level.description;
        GameMode.appMode = "createLevel";
        EditorState.isInEditor = true;
        CursorState.isCursorNeeded = true;
        onStart();
    };

    if (showOptions) {
        return <div className="fixed inset-0 bg-ink-950">
            <OptionsMenu onBack={() => setShowOptions(false)} />
        </div>;
    }

    if (showLevelBrowser) {
        return <LevelBrowser onSelectLevel={playLevel} onEditLevel={editLevel} onBack={() => setShowLevelBrowser(false)} />;
    }

    const items = [
        {label: "Play", hint: "Community levels", onClick: () => setShowLevelBrowser(true)},
        {label: "Editor", hint: "Build your own", onClick: openEditor},
        {label: "Options", hint: "Sensitivity · audio", onClick: () => setShowOptions(true)},
    ];

    return <div className="fixed inset-0 bg-ink-950 overflow-hidden">
        <div className="lava-background absolute inset-0" />
        {/* Heavier on the left so the menu reads cleanly while the lava still shows on the right. */}
        <div className="absolute inset-0 bg-linear-to-r from-ink-950 via-ink-950/85 to-ink-950/30" />
        <div className="nv-hazard absolute bottom-0 inset-x-0" />
        <AccountSection />

        <div className="relative h-full flex flex-col justify-center gap-12 pl-[8vw]">
            <div style={{animation: "nv-slide-in 0.5s ease-out both"}}>
                <div className="nv-label mb-2">Time Trial · FPS · Level Editor</div>
                <h1 className="nv-title text-[9rem] text-bone" style={{textShadow: "6px 6px 0 var(--color-molten-deep)"}}>
                    Nova
                </h1>
            </div>

            <nav className="flex flex-col gap-1 w-96">
                {items.map((item, i) => (
                    <div key={item.label} style={{animation: `nv-slide-in 0.4s ${0.1 + i * 0.07}s ease-out both`}}>
                        <button className="nv-menu-item group" onClick={item.onClick}>
                            <span className="nv-menu-index">0{i + 1}</span>
                            <span className="flex-1">{item.label}</span>
                            <span className="font-mono text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.hint}
                            </span>
                        </button>
                    </div>
                ))}
            </nav>
        </div>
    </div>;
};
