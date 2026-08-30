import {useEffect, useState} from "react";
import {Countdown} from "../../../../Three/Utility/Countdown";

//Countdown is plain mutable state, not React state - re-render every frame to read it live.
export const CountdownDisplay = () => {
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

    if (!Countdown.isActive) return null;

    const displayValue = Math.ceil(Countdown.secondsRemaining);

    //Full opacity until the final second (displayValue 1), then fades linearly alongside it -
    //driven by the live countdown value, not a fixed-duration animation, so it also tracks a
    //pause correctly instead of running out behind the menu.
    const bannerOpacity = Math.min(1, Countdown.secondsRemaining);

    return <div className="absolute inset-0 flex items-center justify-center">
        <style>{`
            @keyframes countdown-pop {
                from { transform: scale(0.3); }
                to { transform: scale(1); }
            }
        `}</style>
        <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 bg-slate-950/60 border-y border-orange-500/40"
            style={{opacity: bannerOpacity}}
        />
        {/* key remounts this element per number, restarting the pop animation each time it changes. */}
        <div
            key={displayValue}
            className="relative z-10 text-8xl font-bold text-orange-500"
            style={{animation: "countdown-pop 0.3s ease-out"}}
        >
            {displayValue}
        </div>
    </div>;
};
