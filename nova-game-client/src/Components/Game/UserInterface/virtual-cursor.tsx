import { useRef } from "react";


export const VirtualCursor = () => {
    //TODO Implement hover cursor and click cursor!
    const cursorImageRef = useRef<HTMLImageElement>(null);;


    return <div className="absolute z-20 w-1/35 pointer-events-none" id={"virtual-cursor"}>
            <img ref={cursorImageRef} className="z-20" src={"/Nova_Cursor.png"} alt={"Virtual Cursor"} />
        </div>


}