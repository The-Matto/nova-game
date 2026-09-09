import {useState} from "react";
import {CursorState, EditingLevel, EditorState, GameMode, LevelSelection} from "../../../Three/Utility/PlayerGlobals";
import {RecordLevelPlay} from "../../../Three/Utility/LevelPlays";
import {OptionsMenu} from "./OptionsMenu";
import {LevelBrowser} from "./LevelBrowser";
import {AccountSection} from "./AccountSection";
import type {LevelSummary} from "nova-shared/level-listing";

//Shown before the game exists at all - Canvas/Game only mount once a choice is made here (see
//App.tsx). Sets GameMode.appMode (and EditorState/CursorState to match, since those otherwise
//stay frozen at their own module's load-time default) before handing off.
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

    //Opens on a genuinely blank level, not a hardcoded default - EditorStartupModal (see
    //EditorMenu) offers a real choice (a local save, one of your uploads, or a preset) right
    //after, so nothing here is ever actually seen unless the player picks "Start Blank".
    const openEditor = () => {
        LevelSelection.selectedLevelPath = "/BlankLevel.json";
        GameMode.appMode = "createLevel";
        EditorState.isInEditor = true;
        CursorState.isCursorNeeded = true;
        onStart();
    };

    //From a level's ⋮ menu (see LevelBrowser) - opens the editor on that level instead of a
    //fresh one, and remembers its id/metadata so Upload can offer "Update" instead of only
    //ever creating a new level.
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
        return <div className="fixed inset-0 bg-slate-950">
            <OptionsMenu onBack={() => setShowOptions(false)} />
        </div>;
    }

    if (showLevelBrowser) {
        return <LevelBrowser onSelectLevel={playLevel} onEditLevel={editLevel} onBack={() => setShowLevelBrowser(false)} />;
    }

    return <div className="fixed inset-0 flex items-center justify-center bg-slate-950 overflow-hidden">
        <div className="lava-background absolute inset-0" />
        {/* Dulls the lava enough that it reads as a backdrop, not something competing with the
        menu card itself. */}
        <div className="absolute inset-0 bg-slate-950/55" />
        <AccountSection />
        <div className="relative flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-16 py-12">
            <div className="text-6xl font-bold text-orange-500 mb-4">Nova Game</div>
            <button
                className="w-48 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={() => setShowLevelBrowser(true)}
            >
                Play
            </button>
            <button
                className="w-48 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={openEditor}
            >
                Editor
            </button>
            <button
                className="w-48 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl text-xl text-orange-500 cursor-pointer"
                onClick={() => setShowOptions(true)}
            >
                Options
            </button>
        </div>
    </div>;
};
