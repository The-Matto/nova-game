import {useEffect, useState} from "react";
import {GameEvents} from "../../../Three/Utility/GameEvents";
import {EditorState, UIState} from "../../../Three/Utility/PlayerGlobals";

//Browsers only grant pointer lock from a genuine click tied to the target element, and the
//canvas doesn't exist yet when Play is clicked (it mounts after) - so a real extra click is
//unavoidable. This just makes it obvious one's needed. pointer-events-none so it never eats
//the very click it's prompting for.
export const ClickToPlayHint = () => {

    const [isLocked, setIsLocked] = useState(!!document.pointerLockElement);
    const [isInEditor, setIsInEditor] = useState(EditorState.isInEditor);
    const [isModalOpen, setIsModalOpen] = useState(UIState.isModalOpen);

    useEffect(() => {
        const handler = () => setIsLocked(!!document.pointerLockElement);
        document.addEventListener('pointerlockchange', handler);
        return () => document.removeEventListener('pointerlockchange', handler);
    }, []);

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

    if (isInEditor || isModalOpen || isLocked) return null;

    return <div className="absolute inset-x-0 top-1/4 z-20 flex justify-center pointer-events-none">
        <div className="text-white text-2xl font-bold bg-slate-950/60 px-6 py-3 rounded-xl">
            Click to Play
        </div>
    </div>;
};
