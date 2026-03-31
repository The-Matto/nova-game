
import {NVPlayerCharacter} from "../../../Three/Actors/PlayerCharacter";

import {VirtualCursor} from "./virtual-cursor";
import {useEffect, useRef} from "react";
import {PlayerStatics} from "../../../Three/Utility/PlayerGlobals";


export interface InteractiveElement extends HTMLElement {
    remoteTrigger?: () => void;
}

export const GameUIMain = () => {

    const domRef = useRef<HTMLDivElement>(null);

    const internalAction = () => {

        const playerChar : NVPlayerCharacter | undefined = PlayerStatics.PlayerCharacter;

        if (playerChar)
            playerChar.GetPhysicsComp().isFreeFlying = !playerChar.GetPhysicsComp().isFreeFlying;

    };

    useEffect(() => {
        if (domRef.current) {
            // Attach the function directly to the DOM element object
            (domRef.current as InteractiveElement).remoteTrigger = internalAction;
        }
    }, []);


    return <>
        <VirtualCursor />
        <div ref={domRef} className="absolute bg-slate-900 p-4 rounded-xl text-3xl text-orange-500 bottom-1 right-1">Editor
        </div>
    </>
}