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

    //One square per remaining target - just a placeholder icon for now.
    return <div className="absolute top-6 left-6 flex gap-2">
        {LevelObjectives.GetIncomplete().map((objective, i) => (
            <div key={i} className="w-10 h-10 bg-white" title={objective.label} />
        ))}
    </div>;
};
