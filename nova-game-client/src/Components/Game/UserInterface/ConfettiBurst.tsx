import {useEffect, useRef, useState} from "react";

interface Particle {
    id : number;
    x : number;
    y : number;
    vx : number;
    vy : number;
    size : number;
    color : string;
    rotation : number;
    rotationSpeed : number;
}

const PARTICLE_COUNT = 90;
const GRAVITY = 1400; //px/s^2
//Once a particle's falling, its downward speed is clamped here instead of left to accelerate
//forever - reads as a gentle float down rather than freefall.
const MAX_FALL_SPEED = 160;
const OFFSCREEN_MARGIN = 60;

function SpawnParticle(id : number) : Particle {
    const originX = window.innerWidth / 2 + (Math.random() - 0.5) * window.innerWidth * 0.5;
    const originY = window.innerHeight / 2 + (Math.random() - 0.5) * 80;
    return {
        id,
        x: originX,
        y: originY,
        vx: (Math.random() - 0.5) * 500,
        vy: -600 - Math.random() * 500,
        size: 6 + Math.random() * 8,
        color: `hsl(${Math.random() * 360}, 85%, 60%)`,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 360,
    };
}

//Fired once per new personal best (see LevelCompleteOverlay) - launches a burst of colored boxes
//from behind the menu, arcing up under gravity then floating back down until they drift offscreen
//and get culled. Self-terminating: the animation loop stops once every particle's gone.
export const ConfettiBurst = () => {
    const particlesRef = useRef<Particle[]>(Array.from({length: PARTICLE_COUNT}, (_, i) => SpawnParticle(i)));
    const lastFrameTime = useRef<number | null>(null);
    const [, forceRender] = useState(0);

    useEffect(() => {
        let frameId : number;

        const tick = (time : number) => {
            const delta = lastFrameTime.current === null ? 0 : (time - lastFrameTime.current) / 1000;
            lastFrameTime.current = time;

            particlesRef.current = particlesRef.current
                .map(p => {
                    const vy = Math.min(p.vy + GRAVITY * delta, MAX_FALL_SPEED);
                    return {...p, x: p.x + p.vx * delta, y: p.y + vy * delta, vy, rotation: p.rotation + p.rotationSpeed * delta};
                })
                .filter(p => p.y < window.innerHeight + OFFSCREEN_MARGIN
                    && p.x > -OFFSCREEN_MARGIN && p.x < window.innerWidth + OFFSCREEN_MARGIN);

            forceRender(n => n + 1);
            if (particlesRef.current.length > 0) frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, []);

    if (particlesRef.current.length === 0) return null;

    return <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {particlesRef.current.map(p => (
            <div
                key={p.id}
                className="absolute rounded-sm"
                style={{left: p.x, top: p.y, width: p.size, height: p.size, backgroundColor: p.color, transform: `rotate(${p.rotation}deg)`}}
            />
        ))}
    </div>;
};
