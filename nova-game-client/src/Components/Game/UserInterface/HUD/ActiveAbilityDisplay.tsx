import {useEffect, useState} from "react";
import {PlayerStatics} from "../../../../Three/Utility/PlayerGlobals";

//One pill per currently-active powerup ability (see NVPowerupPickup) - reads the remaining-time
//getters directly off physics/weapon every frame, same "plain mutable state, not React state"
//pattern as the rest of the HUD. Add a new ability here as its own entry once it has a
//secondsRemaining getter to read.
export const ActiveAbilityDisplay = () => {
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

    const physics = PlayerStatics.PlayerCharacter?.GetPhysicsComp();
    const weapon = PlayerStatics.PlayerCharacter?.GetWeapon();

    const active = [
        {label: "Gravity", remaining: physics?.gravityBoostSecondsRemaining ?? 0},
        {label: "Speed Boost", remaining: physics?.speedBoostSecondsRemaining ?? 0},
        {label: "Fast Fire", remaining: weapon?.fastFireSecondsRemaining ?? 0},
    ].filter(a => a.remaining > 0);

    if (active.length === 0) return null;

    //Sits above ControlsHint's bottom-2 text, not on top of it.
    return <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex flex-row gap-2">
        {active.map(a => (
            <div key={a.label} className="flex items-center gap-2 bg-slate-950/60 border border-orange-500/40 rounded-lg px-3 py-1">
                <span className="text-orange-500 font-bold text-sm">{a.label}</span>
                <span className="text-white font-mono text-sm">{a.remaining.toFixed(1)}s</span>
            </div>
        ))}
    </div>;
};
