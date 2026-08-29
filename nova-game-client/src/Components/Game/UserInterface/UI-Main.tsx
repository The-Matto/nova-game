import {LevelCompleteOverlay} from "./LevelCompleteOverlay";
import {GameMenuOverlay} from "./GameMenuOverlay";
import {EditorMenu} from "./EditorMenu";
import {ControlsHint} from "./ControlsHint";
import {HUD} from "./HUD/HUD";

export const GameUIMain = () => {
    return <>
        <HUD />
        <LevelCompleteOverlay />
        <GameMenuOverlay />
        <EditorMenu />
        <ControlsHint />
    </>;
};
