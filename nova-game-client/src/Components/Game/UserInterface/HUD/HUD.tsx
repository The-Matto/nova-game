import {useEffect, useState} from "react";
import {GameEvents} from "../../../../Three/Utility/GameEvents";
import {EditorState, UIState} from "../../../../Three/Utility/PlayerGlobals";
import {Crosshair} from "./Crosshair";
import {TimerDisplay} from "./TimerDisplay";
import {TargetsRemaining} from "./TargetsRemaining";

//In-game HUD - crosshair, timer, targets remaining, and a home for future elements like ammo/
//health. Hidden in editor mode and behind any menu (UIState.isModalOpen isn't event-driven, so
//poll it each frame - the same live-read pattern the HUD's own children already use).
export const HUD = () => {

    const [isInEditor, setIsInEditor] = useState(EditorState.isInEditor);
    const [isModalOpen, setIsModalOpen] = useState(UIState.isModalOpen);

    useEffect(() => {
        return GameEvents.On('editorModeChanged', ({isInEditor}) => setIsInEditor(isInEditor));
    }, []);

    useEffect(() => {
        let frame : number;
        const tick = () => {
            setIsModalOpen(UIState.isModalOpen);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    if (isInEditor || isModalOpen) return null;

    return <div className="absolute inset-0 z-10 pointer-events-none">
        <Crosshair />
        <TimerDisplay />
        <TargetsRemaining />
    </div>;
};
