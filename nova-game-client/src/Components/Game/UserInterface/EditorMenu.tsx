import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {EditingLevel, EditorState} from "../../../Three/Utility/PlayerGlobals";
import {EditorInspectorPanel} from "./EditorInspectorPanel";
import {EditorPalettePanel} from "./EditorPalettePanel";
import {EditorWorldSettingsPanel} from "./EditorWorldSettingsPanel";
import {EditorStartupModal} from "./EditorStartupModal";

//Editor layout, shown in editor mode - world settings/save/load/upload at the far left, the
//spawn-actor menu at the far right with the selected-actor inspector to its left (only taking up
//space once something's selected). All children unmount (rather than merely hiding) on leaving
//editor mode, so their own state resets for free.
export const EditorMenu = () => {

    //Reflects EditorState.isInEditor's current value (rather than always starting false) since
    //the game now launches straight into editor mode - see PlayInEditor.Initialize.
    const [isVisible, setIsVisible] = useState(EditorState.isInEditor);

    //Only for a genuinely fresh session (MainMenu's openEditor leaves EditingLevel.id null) -
    //re-opening a specific upload via the level browser's "Edit Level" already sets it, and
    //already is a deliberate choice of starting point, so this is skipped entirely then.
    const [showStartupModal, setShowStartupModal] = useState(EditingLevel.id === null);

    useEffect(() => {
        return GameEvents.On('editorModeChanged', ({isInEditor}) => setIsVisible(isInEditor));
    }, []);

    if (!isVisible) return null;

    //pointer-events-none - otherwise the empty space below the shorter card would still swallow
    //clicks meant for the game view. Each card opts back in via pointer-events-auto.
    return <>
        {showStartupModal && <EditorStartupModal onClose={() => setShowStartupModal(false)} />}
        {/* top-12, not top-4 like the right side - HomeLink sits at top-2 left-2 and would
        otherwise overlap this panel's header. */}
        <div className="absolute top-12 left-4 z-30 pointer-events-none">
            <EditorWorldSettingsPanel />
        </div>
        <div className="absolute top-4 right-4 z-30 flex flex-row items-start gap-3 pointer-events-none">
            <EditorInspectorPanel />
            <EditorPalettePanel />
        </div>
    </>;
};
