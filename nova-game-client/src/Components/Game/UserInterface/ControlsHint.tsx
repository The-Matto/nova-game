import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {EditorState, UIState} from "../../../Three/Utility/PlayerGlobals";

const EDITOR_CONTROLS = [
    "WASD Move · RMB Look Around · LMB Select / Drag Gizmo · Ctrl+LMB Add to Selection · Alt+Drag Duplicate",
    "W/E/R Move / Rotate / Scale Gizmo · Del Delete · P Play",
];

const PLAY_CONTROLS = [
    "WASD Move · Space Jump · LMB Fire · P Pause · R Reset",
];

//A bottom-of-screen reminder of the current mode's controls - text only, so it never blocks
//clicks to the game view behind it. Hidden behind a menu, same as HUD.
export const ControlsHint = () => {

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

    if (isModalOpen) return null;

    const lines = isInEditor ? EDITOR_CONTROLS : PLAY_CONTROLS;

    return <div className="absolute bottom-2 inset-x-0 z-10 flex flex-col items-center gap-0.5 pointer-events-none">
        {lines.map((line, i) => (
            <div key={i} className="flex gap-3 font-mono text-[11px] uppercase tracking-wider text-bone/80 [text-shadow:0_1px_2px_#000]">
                {line.split(" · ").map((part, j) => (
                    <span key={j} className="flex gap-3">
                        {j > 0 && <span className="text-molten">/</span>}
                        {part}
                    </span>
                ))}
            </div>
        ))}
    </div>;
};
