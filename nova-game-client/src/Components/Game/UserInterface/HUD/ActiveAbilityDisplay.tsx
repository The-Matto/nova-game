import {useEffect, useState} from "react";
import {PlayerStatics} from "../../../../Three/Utility/PlayerGlobals";

//One pill per currently-active powerup ability (see NVPowerupPickup) - reads the remaining-time/
//fraction getters directly off physics/weapon every frame, same "plain mutable state, not React
//state" pattern as the rest of the HUD. Add a new ability here as its own entry once it has
//secondsRemaining/Fraction getters to read.
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
        {label: "Gravity", remaining: physics?.gravityBoostSecondsRemaining ?? 0, fraction: physics?.gravityBoostFraction ?? 0},
        {label: "Speed Boost", remaining: physics?.speedBoostSecondsRemaining ?? 0, fraction: physics?.speedBoostFraction ?? 0},
        {label: "Fast Fire", remaining: weapon?.fastFireSecondsRemaining ?? 0, fraction: weapon?.fastFireFraction ?? 0},
    ].filter(a => a.remaining > 0);

    if (active.length === 0) return null;

    //Sits above ControlsHint's bottom-2 text, not on top of it.
    return <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-row gap-2">
        {active.map(a => (
            <div key={a.label} className="relative w-36 h-7 overflow-hidden border border-ink-600 bg-ink-950/70">
                {/* The fill sits behind the label, draining right-to-left as the ability runs out. */}
                <div
                    className="absolute inset-y-0 left-0 bg-molten/50 border-r-2 border-molten"
                    style={{width: `${a.fraction * 100}%`}}
                />
                <div className="relative z-10 flex items-center justify-center h-full font-mono uppercase tracking-widest text-bone font-bold text-[11px]">
                    {a.label}
                </div>
            </div>
        ))}
    </div>;
};
