import {LevelCompleteOverlay} from "./LevelCompleteOverlay";
import {GameMenuOverlay} from "./GameMenuOverlay";
import {EditorPalettePanel} from "./EditorPalettePanel";
import {EditorInspectorPanel} from "./EditorInspectorPanel";

export const GameUIMain = () => {
    return <>
        <LevelCompleteOverlay />
        <GameMenuOverlay />
        <EditorPalettePanel />
        <EditorInspectorPanel />
    </>;
};
