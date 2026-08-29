import {LevelCompleteOverlay} from "./LevelCompleteOverlay";
import {GameMenuOverlay} from "./GameMenuOverlay";
import {EditorPalettePanel} from "./EditorPalettePanel";
import {EditorInspectorPanel} from "./EditorInspectorPanel";
import {HUD} from "./HUD/HUD";

export const GameUIMain = () => {
    return <>
        <HUD />
        <LevelCompleteOverlay />
        <GameMenuOverlay />
        <EditorPalettePanel />
        <EditorInspectorPanel />
    </>;
};
