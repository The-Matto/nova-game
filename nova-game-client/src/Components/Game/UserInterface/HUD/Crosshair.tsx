import {useEffect, useState} from "react";
import {Countdown} from "../../../../Three/Utility/Countdown";

//Two identical bars centered on screen, one rotated 90deg onto the other, forming a plus.
//Hidden during the pre-run countdown - nothing to aim at yet.
export const Crosshair = () => {
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

    if (Countdown.isActive) return null;

    const bar = "absolute top-1/2 left-1/2 w-[2px] h-4 bg-white -translate-x-1/2 -translate-y-1/2";
    return <>
        <div className={bar} />
        <div className={`${bar} rotate-90`} />
    </>;
};
