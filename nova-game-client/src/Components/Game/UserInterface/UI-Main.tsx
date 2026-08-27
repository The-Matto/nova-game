import {LevelCompleteOverlay} from "./LevelCompleteOverlay";
import {EditorPalettePanel} from "./EditorPalettePanel";
import {EditorInspectorPanel} from "./EditorInspectorPanel";

export const GameUIMain = () => {
    return <>
        <LevelCompleteOverlay />
        <EditorPalettePanel />
        <EditorInspectorPanel />
    </>;
};
