//Two identical bars centered on screen, one rotated 90deg onto the other, forming a plus.
export const Crosshair = () => {
    const bar = "absolute top-1/2 left-1/2 w-[2px] h-4 bg-white -translate-x-1/2 -translate-y-1/2";
    return <>
        <div className={bar} />
        <div className={`${bar} rotate-90`} />
    </>;
};
