import {useState} from "react";
import {CursorState, EditorState, GameMode, LevelSelection} from "../../../Three/Utility/PlayerGlobals";
import {OptionsMenu} from "./OptionsMenu";
import {LevelBrowser} from "./LevelBrowser";
import type {LevelSummary} from "nova-shared/level-listing";

//Shown before the game exists at all - Canvas/Game only mount once a choice is made here (see
//App.tsx). Sets GameMode.appMode (and EditorState/CursorState to match, since those otherwise
//stay frozen at their own module's load-time default) before handing off.
export const MainMenu = ({onStart} : { onStart : () => void }) => {

    const [showOptions, setShowOptions] = useState(false);
    const [showLevelBrowser, setShowLevelBrowser] = useState(false);

    const playLevel = (level : LevelSummary) => {
        LevelSelection.selectedLevelPath = level.path;
        GameMode.appMode = "play";
        EditorState.isInEditor = false;
        CursorState.isCursorNeeded = false;
        onStart();
    };

    const openEditor = () => {
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
        return <LevelBrowser onSelectLevel={playLevel} onBack={() => setShowLevelBrowser(false)} />;
    }

    return <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 border border-orange-500/40 rounded-2xl bg-slate-900 px-16 py-12">
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
