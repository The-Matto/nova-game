import {useEffect, useState} from "react";
import {FormatLevelTime, LevelTimer} from "../../../../Three/Utility/LevelTimer";

//LevelTimer is a plain mutable object, not React state - re-render every frame to read it live.
export const TimerDisplay = () => {
    const [, forceRender] = useState(0);

    useEffect(() => {
        let frame : number;
        const tick = () => {
            forceRender(n => n + 1);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    return <div className="absolute top-5 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="nv-label text-bone/70">Time</div>
        <div className="font-mono font-bold text-3xl text-bone tabular-nums bg-ink-950/60 border-b-2 border-molten px-4 py-0.5">
            {FormatLevelTime(LevelTimer.elapsedTime)}
        </div>
    </div>;
};
