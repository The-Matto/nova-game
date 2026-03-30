import {Scene} from "../../../Three/Scene";
import {NVActor} from "../../../Three/Actor";
import {NVPlayerCharacter} from "../../../Three/Actors/PlayerCharacter";
import {Game} from "../../../Three/Game";


export const GameUIMain = () => {

    const OnClickBtn = () =>{
        console.log("onclick");

        //TODO Make global statics to get player character, controller, GM, ect
        for(const actor of Scene.GetSceneActors()) {
            if (actor instanceof NVPlayerCharacter ) {
                console.log(actor);
                actor.GetPhysicsComp().isFreeFlying = !actor.GetPhysicsComp().isFreeFlying;
            }

        }
    }

    return <div onClick={OnClickBtn} className="absolute bg-slate-900 p-4 rounded-xl text-3xl text-orange-500 bottom-1 right-1">Editor

        </div>
}