import {useEffect, useState} from "react";
import {LevelObjectives} from "../../../../Three/Gameplay/LevelObjectives";

//LevelObjectives is plain mutable state, not React state - re-render every frame to read it live.
export const TargetsRemaining = () => {
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

    //One icon per remaining target - served straight from public/, no import needed.
    return <div className="absolute top-16 left-6 flex flex-col gap-1">
        <div className="text-white text-lg">Targets Remaining</div>
        <div className="flex gap-2">
            {LevelObjectives.GetIncomplete().map((objective, i) => (
                <img key={i} src="/T_NV_Target.png" alt="" className="w-10 h-10" title={objective.label} />
            ))}
        </div>
    </div>;
};
