import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {EditorState} from "../../../Three/Utility/PlayerGlobals";
import {EditorInspectorPanel} from "./EditorInspectorPanel";
import {EditorPalettePanel} from "./EditorPalettePanel";

//Top-right editor layout, shown in editor mode - the spawn-actor menu sits at the far right, with
//the selected-actor inspector to its left (only taking up space once something's selected). Both
//children unmount (rather than merely hiding) on leaving editor mode, so their own state resets
//for free.
export const EditorMenu = () => {

    //Reflects EditorState.isInEditor's current value (rather than always starting false) since
    //the game now launches straight into editor mode - see PlayInEditor.Initialize.
    const [isVisible, setIsVisible] = useState(EditorState.isInEditor);

    useEffect(() => {
        return GameEvents.On('editorModeChanged', ({isInEditor}) => setIsVisible(isInEditor));
    }, []);

    if (!isVisible) return null;

    //pointer-events-none - otherwise the empty space below the shorter card would still swallow
    //clicks meant for the game view. Each card opts back in via pointer-events-auto.
    return <div className="absolute top-4 right-4 z-30 flex flex-row items-start gap-3 pointer-events-none">
        <EditorInspectorPanel />
        <EditorPalettePanel />
    </div>;
};
