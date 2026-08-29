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

    return <div className="absolute top-6 left-1/2 -translate-x-1/2 text-2xl font-mono text-white">
        {FormatLevelTime(LevelTimer.elapsedTime)}
    </div>;
};
